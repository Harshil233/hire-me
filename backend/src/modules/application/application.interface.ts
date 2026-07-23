import type { ApplicationStatus, Role } from '../../config/constants';
import type { PaginationMeta } from '../../common/http/api-response';
import type { Page } from '../../common/persistence/page';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import { createToken, type Token } from '../../container/token';
import type { JobWithCompany } from '../job/job.interface';
import type {
  ApplyInput,
  JobApplicantQueryInput,
  MyApplicationQueryInput,
} from './application.schema';

export interface Application {
  readonly id: string;
  readonly jobId: string;
  readonly candidateUserId: string;
  readonly status: ApplicationStatus;
  readonly resumeFileId?: string | undefined;
  readonly coverNote?: string | undefined;
  readonly statusUpdatedAt: Date;
  readonly statusUpdatedByUserId?: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Persistence input — the service resolves the job, the candidate and the résumé. */
export interface CreateApplicationData {
  readonly jobId: string;
  readonly candidateUserId: string;
  readonly resumeFileId?: string | undefined;
  readonly coverNote?: string | undefined;
  readonly statusUpdatedAt: Date;
}

export interface ApplicationFilter {
  readonly jobId?: string | undefined;
  readonly candidateUserId?: string | undefined;
  readonly status?: ApplicationStatus | undefined;
}

export interface IApplicationRepository {
  findById(id: string): Promise<Application | null>;
  search(filter: ApplicationFilter, page: number, pageSize: number): Promise<Page<Application>>;
  create(data: CreateApplicationData): Promise<Application>;
  setStatus(
    id: string,
    status: ApplicationStatus,
    actorUserId: string,
    at: Date,
    context?: TransactionContext,
  ): Promise<Application | null>;
}

/**
 * Applicant card data, as an employer needs it. Declared here and implemented by the
 * candidate module, so an employer receives a deliberately narrow view rather than the
 * whole candidate profile (CLAUDE.md §3, ISP).
 */
export interface CandidateSummary {
  readonly userId: string;
  readonly fullName: string;
  readonly currentLocation?: string | undefined;
  readonly skills: readonly string[];
  readonly profilePicFileId?: string | undefined;
}

export interface ICandidateDirectory {
  findSummaries(userIds: readonly string[]): Promise<ReadonlyMap<string, CandidateSummary>>;
}

/** An application as the candidate sees it: with the listing it was for. */
export interface ApplicationWithJob extends Application {
  readonly job: JobWithCompany;
}

/** An application as the employer sees it: with who sent it. */
export interface ApplicationWithCandidate extends Application {
  readonly candidate: CandidateSummary;
}

export interface MyApplicationListResult {
  readonly applications: readonly ApplicationWithJob[];
  readonly pagination: PaginationMeta;
}

export interface ApplicantListResult {
  readonly applications: readonly ApplicationWithCandidate[];
  readonly pagination: PaginationMeta;
}

export interface IApplicationService {
  /** Candidate applies to a published job. Applying twice is a conflict. */
  apply(jobId: string, candidateUserId: string, input: ApplyInput): Promise<ApplicationWithJob>;
  /** The candidate's own applications, never anyone else's. */
  listMine(
    candidateUserId: string,
    query: MyApplicationQueryInput,
  ): Promise<MyApplicationListResult>;
  /** The applicant list for one job, restricted to the company that owns it. */
  listForJob(
    jobId: string,
    actorUserId: string,
    query: JobApplicantQueryInput,
  ): Promise<ApplicantListResult>;
  /**
   * Moves an application through its lifecycle. The actor's role decides which target
   * states are available at all, so a candidate cannot shortlist themselves.
   */
  changeStatus(
    id: string,
    actorUserId: string,
    actorRole: Role,
    status: ApplicationStatus,
  ): Promise<Application>;
}

export const APPLICATION_REPOSITORY: Token<IApplicationRepository> = createToken(
  'IApplicationRepository',
);
export const APPLICATION_SERVICE: Token<IApplicationService> = createToken('IApplicationService');
export const CANDIDATE_DIRECTORY: Token<ICandidateDirectory> = createToken('ICandidateDirectory');
