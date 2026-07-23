import type { Gender, JobType } from '../../config/constants';
import type { PaginationMeta } from '../../common/http/api-response';
import type { Page } from '../../common/persistence/page';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import { createToken, type Token } from '../../container/token';
import type { MobileInput } from '../../common/validation/fields';
import type {
  CandidateQueryInput,
  CreateCandidateProfileInput,
  UpdateCandidateProfileInput,
} from './candidate.schema';

export interface CandidateProfile {
  readonly id: string;
  readonly userId: string;
  readonly firstName: string;
  readonly middleName?: string | undefined;
  readonly lastName: string;
  readonly profilePicFileId?: string | undefined;
  readonly mobile?: MobileInput | undefined;
  readonly gender?: Gender | undefined;
  readonly dob?: Date | undefined;
  readonly currentLocation?: string | undefined;
  readonly preferredLocations: readonly string[];
  readonly skills: readonly string[];
  readonly jobTypes: readonly JobType[];
  readonly currentCtc?: number | undefined;
  readonly expectedCtc?: number | undefined;
  readonly resumeFileId?: string | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * A candidate as an employer browsing the talent pool sees them. Deliberately narrow:
 * date of birth, mobile number and salary expectations are never part of a browse
 * result, the same line the applicant card draws (CLAUDE.md §3, ISP).
 */
export interface CandidateBrowseItem {
  readonly userId: string;
  readonly fullName: string;
  readonly currentLocation?: string | undefined;
  readonly preferredLocations: readonly string[];
  readonly skills: readonly string[];
  readonly jobTypes: readonly JobType[];
  readonly profilePicFileId?: string | undefined;
  readonly resumeFileId?: string | undefined;
}

/** Already validated and whitelisted by the time it reaches the repository. */
export interface CandidateFilter {
  readonly search?: string | undefined;
  readonly skills?: readonly string[] | undefined;
  readonly location?: string | undefined;
  readonly jobType?: JobType | undefined;
}

export interface CandidateListResult {
  readonly candidates: readonly CandidateBrowseItem[];
  readonly pagination: PaginationMeta;
}

export interface ICandidateProfileRepository {
  findByUserId(userId: string): Promise<CandidateProfile | null>;
  /** Batched read so an applicant list never becomes one query per applicant. */
  findManyByUserIds(userIds: readonly string[]): Promise<CandidateProfile[]>;
  search(
    filter: CandidateFilter,
    page: number,
    pageSize: number,
  ): Promise<Page<CandidateProfile>>;
  create(
    userId: string,
    data: CreateCandidateProfileInput,
    context?: TransactionContext,
  ): Promise<CandidateProfile>;
  update(userId: string, data: UpdateCandidateProfileInput): Promise<CandidateProfile | null>;
}

export interface ICandidateProfileService {
  /** Called by registration inside the account-creation transaction. */
  createForUser(
    userId: string,
    data: CreateCandidateProfileInput,
    context?: TransactionContext,
  ): Promise<CandidateProfile>;
  getByUserId(userId: string): Promise<CandidateProfile>;
  update(userId: string, data: UpdateCandidateProfileInput): Promise<CandidateProfile>;
  /** Employer-facing talent pool. Returns browse items, never full profiles. */
  browse(query: CandidateQueryInput): Promise<CandidateListResult>;
}

export const CANDIDATE_PROFILE_REPOSITORY: Token<ICandidateProfileRepository> = createToken(
  'ICandidateProfileRepository',
);
export const CANDIDATE_PROFILE_SERVICE: Token<ICandidateProfileService> = createToken(
  'ICandidateProfileService',
);
