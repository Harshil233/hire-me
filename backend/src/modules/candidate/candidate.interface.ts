import type { Gender, JobType } from '../../config/constants';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import { createToken, type Token } from '../../container/token';
import type { MobileInput } from '../../common/validation/fields';
import type { CreateCandidateProfileInput, UpdateCandidateProfileInput } from './candidate.schema';

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

export interface ICandidateProfileRepository {
  findByUserId(userId: string): Promise<CandidateProfile | null>;
  /** Batched read so an applicant list never becomes one query per applicant. */
  findManyByUserIds(userIds: readonly string[]): Promise<CandidateProfile[]>;
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
}

export const CANDIDATE_PROFILE_REPOSITORY: Token<ICandidateProfileRepository> = createToken(
  'ICandidateProfileRepository',
);
export const CANDIDATE_PROFILE_SERVICE: Token<ICandidateProfileService> = createToken(
  'ICandidateProfileService',
);
