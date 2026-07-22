import type { JobRole, JobStatus, JobType, WorkMode } from '../../config/constants';
import type { PaginationMeta } from '../../common/http/api-response';
import type { Page } from '../../common/persistence/page';
import { createToken, type Token } from '../../container/token';
import type { CreateJobInput, HrJobQueryInput, JobQueryInput, UpdateJobInput } from './job.schema';

export interface Job {
  readonly id: string;
  readonly companyId: string;
  readonly postedByUserId: string;
  readonly title: string;
  readonly description: string;
  readonly role: JobRole;
  readonly jobType: JobType;
  readonly workMode: WorkMode;
  readonly skills: readonly string[];
  readonly locations: readonly string[];
  readonly ctcMin?: number | undefined;
  readonly ctcMax?: number | undefined;
  readonly experienceMinYears?: number | undefined;
  readonly experienceMaxYears?: number | undefined;
  readonly status: JobStatus;
  readonly publishedAt?: Date | undefined;
  readonly closedAt?: Date | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Persistence input — the service supplies the owning company and the poster. */
export interface CreateJobData extends CreateJobInput {
  readonly companyId: string;
  readonly postedByUserId: string;
}

/** Repository-level filter. Already validated and whitelisted by the time it arrives. */
export interface JobFilter extends Omit<JobQueryInput, 'page' | 'pageSize'> {
  readonly status?: JobStatus | undefined;
  readonly companyId?: string | undefined;
}

/**
 * Company headline data as a listing needs it. Declared here and implemented by the
 * company module, so the job module never learns how companies are stored — the same
 * arrangement `ICompanyMembership` uses in the other direction (CLAUDE.md §5, §7).
 */
export interface CompanySummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly logoFileId?: string | undefined;
}

export interface ICompanyDirectory {
  findSummaries(ids: readonly string[]): Promise<ReadonlyMap<string, CompanySummary>>;
}

/** A job as it goes out on the wire, with its company resolved. */
export interface JobWithCompany extends Job {
  readonly company: CompanySummary;
}

export interface IJobRepository {
  findById(id: string): Promise<Job | null>;
  /** Batched read so a page of rows referencing jobs never becomes a query per row. */
  findManyByIds(ids: readonly string[]): Promise<Job[]>;
  search(filter: JobFilter, page: number, pageSize: number): Promise<Page<Job>>;
  create(data: CreateJobData): Promise<Job>;
  update(id: string, data: UpdateJobInput): Promise<Job | null>;
  setStatus(id: string, status: JobStatus, at: Date): Promise<Job | null>;
}

export interface JobListResult {
  readonly jobs: readonly JobWithCompany[];
  readonly pagination: PaginationMeta;
}

export interface IJobService {
  /** Candidate-facing browse: published listings only. */
  browse(query: JobQueryInput): Promise<JobListResult>;
  /** HR-facing list of their own company's postings, drafts included. */
  listForHr(userId: string, query: HrJobQueryInput): Promise<JobListResult>;
  /** Reads one job, hiding unpublished listings from everyone but their own company. */
  getVisible(id: string, viewerUserId: string): Promise<JobWithCompany>;
  /**
   * Batched read for other modules that present jobs beside their own rows. Unfiltered
   * by status on purpose: a candidate must still see the listing they applied to after
   * it has been closed.
   */
  findManyByIds(ids: readonly string[]): Promise<ReadonlyMap<string, JobWithCompany>>;
  create(userId: string, input: CreateJobInput): Promise<JobWithCompany>;
  update(id: string, userId: string, input: UpdateJobInput): Promise<JobWithCompany>;
  changeStatus(id: string, userId: string, status: JobStatus): Promise<JobWithCompany>;
}

/**
 * Narrow read port for other modules (CLAUDE.md §3, ISP). `application` needs a job's
 * company and status to authorise against; it must not reach the job repository.
 */
export interface JobSummary {
  readonly id: string;
  readonly companyId: string;
  readonly status: JobStatus;
  readonly title: string;
}

export interface IJobSummaryProvider {
  findSummaryById(id: string): Promise<JobSummary | null>;
}

export const JOB_REPOSITORY: Token<IJobRepository> = createToken('IJobRepository');
export const JOB_SERVICE: Token<IJobService> = createToken('IJobService');
export const JOB_SUMMARY_PROVIDER: Token<IJobSummaryProvider> =
  createToken('IJobSummaryProvider');
export const COMPANY_DIRECTORY: Token<ICompanyDirectory> = createToken('ICompanyDirectory');
