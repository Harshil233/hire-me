import {
  JOB_STATUSES,
  JOB_STATUS_TRANSITIONS,
  PAGINATION,
  type JobStatus,
} from '../../config/constants';
import {
  ConflictError,
  InternalError,
  NotFoundError,
  ValidationError,
} from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { toPaginationMeta } from '../../common/http/api-response';
import { toSearchTerms } from '../../common/utils/search-terms';
import type { ICompanyMembership } from '../company/company.interface';
import type {
  CompanySummary,
  ICompanyDirectory,
  IJobRepository,
  IJobService,
  Job,
  JobFilter,
  JobListResult,
  JobWithCompany,
} from './job.interface';
import type {
  CreateJobInput,
  HrJobQueryInput,
  JobQueryInput,
  UpdateJobInput,
} from './job.schema';

export class JobService implements IJobService {
  constructor(
    private readonly jobRepository: IJobRepository,
    private readonly membership: ICompanyMembership,
    private readonly companyDirectory: ICompanyDirectory,
    private readonly now: () => Date,
  ) {}

  async browse(query: JobQueryInput): Promise<JobListResult> {
    // Candidates never see anything but live listings, whatever they ask for.
    return this.search({ ...JobService.toFilter(query), status: JOB_STATUSES.PUBLISHED }, query);
  }

  async listForHr(userId: string, query: HrJobQueryInput): Promise<JobListResult> {
    const companyId = await this.requireCompanyId(userId);

    return this.search(
      {
        ...JobService.toFilter(query),
        companyId,
        ...(query.status !== undefined ? { status: query.status } : {}),
      },
      query,
    );
  }

  async getVisible(id: string, viewerUserId: string): Promise<JobWithCompany> {
    const job = await this.requireJob(id);

    // An unpublished listing is invisible outside its own company, and answers 404 so
    // the endpoint cannot be used to confirm that a job id exists.
    if (
      job.status !== JOB_STATUSES.PUBLISHED &&
      !(await this.membership.canManageCompany(viewerUserId, job.companyId))
    ) {
      throw JobService.notFound();
    }

    return this.withCompany(job);
  }

  async findManyByIds(ids: readonly string[]): Promise<ReadonlyMap<string, JobWithCompany>> {
    const jobs = await this.jobRepository.findManyByIds([...new Set(ids)]);
    const withCompanies = await this.attachCompanies(jobs);

    return new Map(withCompanies.map((job) => [job.id, job]));
  }

  async create(userId: string, input: CreateJobInput): Promise<JobWithCompany> {
    const companyId = await this.requireCompanyId(userId);
    const created = await this.jobRepository.create({
      ...input,
      companyId,
      postedByUserId: userId,
    });

    return this.withCompany(created);
  }

  async update(id: string, userId: string, input: UpdateJobInput): Promise<JobWithCompany> {
    await this.requireManageableJob(id, userId);

    const updated = await this.jobRepository.update(id, input);

    if (updated === null) {
      throw JobService.notFound();
    }

    return this.withCompany(updated);
  }

  async changeStatus(id: string, userId: string, status: JobStatus): Promise<JobWithCompany> {
    const job = await this.requireManageableJob(id, userId);

    if (job.status === status) {
      return this.withCompany(job);
    }

    if (!JOB_STATUS_TRANSITIONS[job.status].includes(status)) {
      throw new ValidationError(
        `A ${job.status} job cannot become ${status}`,
        [{ field: 'status', message: `Cannot move from ${job.status} to ${status}` }],
        ERROR_CODES.INVALID_STATUS_TRANSITION,
      );
    }

    const updated = await this.jobRepository.setStatus(id, status, this.now());

    if (updated === null) {
      throw JobService.notFound();
    }

    return this.withCompany(updated);
  }

  private async search(filter: JobFilter, query: JobQueryInput): Promise<JobListResult> {
    const page = query.page || PAGINATION.DEFAULT_PAGE;
    const pageSize = query.pageSize || PAGINATION.DEFAULT_PAGE_SIZE;

    const { items, total } = await this.jobRepository.search(
      await this.withCompanyMatches(filter),
      page,
      pageSize,
    );

    return {
      jobs: await this.attachCompanies(items),
      pagination: toPaginationMeta(total, page, pageSize),
    };
  }

  /**
   * The employer's name is searchable too, but only this module may read companies — so
   * the ids are resolved here, per search word, and handed to the repository as values.
   */
  private async withCompanyMatches(filter: JobFilter): Promise<JobFilter> {
    if (filter.search === undefined) {
      return filter;
    }

    const words = toSearchTerms(filter.search);
    const matches = await Promise.all(
      words.map(async (word) => [word, await this.companyDirectory.findIdsByName(word)] as const),
    );

    return { ...filter, searchCompanyIds: new Map(matches) };
  }

  /** One directory call for the whole page, so a list never becomes a query per row. */
  private async attachCompanies(jobs: readonly Job[]): Promise<JobWithCompany[]> {
    if (jobs.length === 0) {
      return [];
    }

    const summaries = await this.companyDirectory.findSummaries(jobs.map((job) => job.companyId));

    return jobs.map((job) => ({ ...job, company: JobService.requireCompany(summaries, job) }));
  }

  private async withCompany(job: Job): Promise<JobWithCompany> {
    const [withCompany] = await this.attachCompanies([job]);

    // `attachCompanies` returns one entry per input, so this is unreachable in practice.
    if (withCompany === undefined) {
      throw new InternalError('Job could not be presented');
    }

    return withCompany;
  }

  /** Posting requires a company; an HR that has not registered one yet cannot post. */
  private async requireCompanyId(userId: string): Promise<string> {
    const companyId = await this.membership.findCompanyIdForUser(userId);

    if (companyId === null) {
      throw new ConflictError(
        'Register your company before posting a job',
        ERROR_CODES.HR_HAS_NO_COMPANY,
      );
    }

    return companyId;
  }

  private async requireJob(id: string): Promise<Job> {
    const job = await this.jobRepository.findById(id);

    if (job === null) {
      throw JobService.notFound();
    }

    return job;
  }

  /** Another company's job is reported as missing, never as forbidden. */
  private async requireManageableJob(id: string, userId: string): Promise<Job> {
    const job = await this.requireJob(id);

    if (!(await this.membership.canManageCompany(userId, job.companyId))) {
      throw JobService.notFound();
    }

    return job;
  }

  private static notFound(): NotFoundError {
    return new NotFoundError('Job not found', ERROR_CODES.JOB_NOT_FOUND);
  }

  /**
   * Companies are never deleted and `companyId` is always set from a live membership, so
   * a missing summary means the data is corrupt. Fail loudly rather than serve a listing
   * with no employer on it.
   */
  private static requireCompany(
    summaries: ReadonlyMap<string, CompanySummary>,
    job: Job,
  ): CompanySummary {
    const company = summaries.get(job.companyId);

    if (company === undefined) {
      throw new InternalError(`Job ${job.id} references a company that no longer exists`);
    }

    return company;
  }

  /** Drops paging keys so only real filter fields reach the repository. */
  private static toFilter(query: JobQueryInput): JobFilter {
    const { page: _page, pageSize: _pageSize, ...filter } = query;
    return filter;
  }
}
