import {
  APPLICATION_STATUS_ACTORS,
  APPLICATION_STATUS_TRANSITIONS,
  JOB_STATUSES,
  PAGINATION,
  ROLES,
  type ApplicationStatus,
  type Role,
} from '../../config/constants';
import { InternalError, NotFoundError, ValidationError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { toPaginationMeta } from '../../common/http/api-response';
import type { Page } from '../../common/persistence/page';
import type { ICompanyMembership } from '../company/company.interface';
import type { ICandidateProfileService } from '../candidate/candidate.interface';
import type { IJobService, IJobSummaryProvider } from '../job/job.interface';
import type {
  Application,
  ApplicantListResult,
  ApplicationWithCandidate,
  ApplicationWithJob,
  IApplicationRepository,
  IApplicationService,
  ICandidateDirectory,
  MyApplicationListResult,
} from './application.interface';
import type {
  ApplyInput,
  JobApplicantQueryInput,
  MyApplicationQueryInput,
} from './application.schema';

export interface ApplicationServiceDependencies {
  readonly applicationRepository: IApplicationRepository;
  readonly jobService: IJobService;
  readonly jobSummaries: IJobSummaryProvider;
  readonly membership: ICompanyMembership;
  readonly candidateProfileService: ICandidateProfileService;
  readonly candidateDirectory: ICandidateDirectory;
  readonly now: () => Date;
}

export class ApplicationService implements IApplicationService {
  constructor(private readonly deps: ApplicationServiceDependencies) {}

  async apply(
    jobId: string,
    candidateUserId: string,
    input: ApplyInput,
  ): Promise<ApplicationWithJob> {
    // `getVisible` already answers 404 for a listing this candidate may not see.
    const job = await this.deps.jobService.getVisible(jobId, candidateUserId);

    if (job.status !== JOB_STATUSES.PUBLISHED) {
      throw new ValidationError(
        'This job is not accepting applications',
        [{ field: 'jobId', message: `The listing is ${job.status}` }],
        ERROR_CODES.JOB_NOT_ACCEPTING_APPLICATIONS,
      );
    }

    // Snapshot the résumé that is current right now: the candidate may replace it later,
    // and the employer must keep seeing what was actually submitted.
    const profile = await this.deps.candidateProfileService.getByUserId(candidateUserId);

    const created = await this.deps.applicationRepository.create({
      jobId,
      candidateUserId,
      statusUpdatedAt: this.deps.now(),
      ...(profile.resumeFileId !== undefined ? { resumeFileId: profile.resumeFileId } : {}),
      ...(input.coverNote !== undefined ? { coverNote: input.coverNote } : {}),
    });

    return { ...created, job };
  }

  async listMine(
    candidateUserId: string,
    query: MyApplicationQueryInput,
  ): Promise<MyApplicationListResult> {
    const { page, pageSize } = ApplicationService.paging(query);

    const result = await this.deps.applicationRepository.search(
      {
        candidateUserId,
        ...(query.status !== undefined ? { status: query.status } : {}),
      },
      page,
      pageSize,
    );

    return {
      applications: await this.attachJobs(result.items),
      pagination: toPaginationMeta(result.total, page, pageSize),
    };
  }

  async listForJob(
    jobId: string,
    actorUserId: string,
    query: JobApplicantQueryInput,
  ): Promise<ApplicantListResult> {
    await this.requireManageableJob(jobId, actorUserId);

    const { page, pageSize } = ApplicationService.paging(query);
    const result = await this.deps.applicationRepository.search(
      { jobId, ...(query.status !== undefined ? { status: query.status } : {}) },
      page,
      pageSize,
    );

    return {
      applications: await this.attachCandidates(result),
      pagination: toPaginationMeta(result.total, page, pageSize),
    };
  }

  async changeStatus(
    id: string,
    actorUserId: string,
    actorRole: Role,
    status: ApplicationStatus,
  ): Promise<Application> {
    const application = await this.requireApplication(id);

    await this.requireActorMayTouch(application, actorUserId, actorRole);

    // Who may move an application into this state at all. A candidate cannot shortlist
    // themselves, and an employer cannot withdraw on a candidate's behalf.
    if (APPLICATION_STATUS_ACTORS[status] !== actorRole) {
      throw new ValidationError(
        `Your account type cannot set an application to ${status}`,
        [{ field: 'status', message: `Only ${APPLICATION_STATUS_ACTORS[status]} may do that` }],
        ERROR_CODES.INVALID_STATUS_TRANSITION,
      );
    }

    if (application.status === status) {
      return application;
    }

    if (!APPLICATION_STATUS_TRANSITIONS[application.status].includes(status)) {
      throw new ValidationError(
        `An application that is ${application.status} cannot become ${status}`,
        [
          {
            field: 'status',
            message: `Cannot move from ${application.status} to ${status}`,
          },
        ],
        ERROR_CODES.INVALID_STATUS_TRANSITION,
      );
    }

    const updated = await this.deps.applicationRepository.setStatus(
      id,
      status,
      actorUserId,
      this.deps.now(),
    );

    if (updated === null) {
      throw ApplicationService.notFound();
    }

    return updated;
  }

  /**
   * Establishes that the caller has any business with this application at all. Both
   * failures answer 404: an employer must not learn that another company's application
   * exists, and neither must a candidate learn about someone else's.
   */
  private async requireActorMayTouch(
    application: Application,
    actorUserId: string,
    actorRole: Role,
  ): Promise<void> {
    if (actorRole === ROLES.CANDIDATE) {
      if (application.candidateUserId !== actorUserId) {
        throw ApplicationService.notFound();
      }
      return;
    }

    await this.requireManageableJob(application.jobId, actorUserId);
  }

  /** The job must exist and belong to a company this user manages; otherwise 404. */
  private async requireManageableJob(jobId: string, actorUserId: string): Promise<void> {
    const summary = await this.deps.jobSummaries.findSummaryById(jobId);

    if (summary === null) {
      throw new NotFoundError('Job not found', ERROR_CODES.JOB_NOT_FOUND);
    }

    if (!(await this.deps.membership.canManageCompany(actorUserId, summary.companyId))) {
      throw new NotFoundError('Job not found', ERROR_CODES.JOB_NOT_FOUND);
    }
  }

  private async requireApplication(id: string): Promise<Application> {
    const application = await this.deps.applicationRepository.findById(id);

    if (application === null) {
      throw ApplicationService.notFound();
    }

    return application;
  }

  /** One batched job read for the whole page. */
  private async attachJobs(
    applications: readonly Application[],
  ): Promise<ApplicationWithJob[]> {
    if (applications.length === 0) {
      return [];
    }

    const jobs = await this.deps.jobService.findManyByIds(
      applications.map((application) => application.jobId),
    );

    return applications.map((application) => ({
      ...application,
      job: ApplicationService.require(jobs.get(application.jobId), application.jobId, 'job'),
    }));
  }

  /** One batched candidate read for the whole page. */
  private async attachCandidates(
    page: Page<Application>,
  ): Promise<ApplicationWithCandidate[]> {
    if (page.items.length === 0) {
      return [];
    }

    const candidates = await this.deps.candidateDirectory.findSummaries(
      page.items.map((application) => application.candidateUserId),
    );

    return page.items.map((application) => ({
      ...application,
      candidate: ApplicationService.require(
        candidates.get(application.candidateUserId),
        application.candidateUserId,
        'candidate',
      ),
    }));
  }

  /**
   * Neither jobs nor accounts are deleted, so a missing reference means the data is
   * corrupt. Fail loudly rather than serve an application with a hole in it.
   */
  private static require<TValue>(value: TValue | undefined, id: string, label: string): TValue {
    if (value === undefined) {
      throw new InternalError(`Application references a ${label} that no longer exists: ${id}`);
    }
    return value;
  }

  private static paging(query: { page: number; pageSize: number }): {
    page: number;
    pageSize: number;
  } {
    return {
      page: query.page || PAGINATION.DEFAULT_PAGE,
      pageSize: query.pageSize || PAGINATION.DEFAULT_PAGE_SIZE,
    };
  }

  private static notFound(): NotFoundError {
    return new NotFoundError('Application not found', ERROR_CODES.APPLICATION_NOT_FOUND);
  }
}
