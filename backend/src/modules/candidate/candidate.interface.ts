import type { Gender, JobType } from '../../config/constants';
import type { PaginationMeta } from '../../common/http/api-response';
import type { Page } from '../../common/persistence/page';
import type { IOwnedResourceLister } from '../../common/persistence/owned-resource.types';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import { createToken, type Token } from '../../container/token';
import type { MobileInput } from '../../common/validation/fields';
import type { Certification } from '../certification/certification.interface';
import type { Education } from '../education/education.interface';
import type { Experience } from '../experience/experience.interface';
import type { Project } from '../project/project.interface';
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

/**
 * A candidate opened from the talent pool. Adds the sections they filled in to be found
 * by — history, study, work, credentials — and nothing more: date of birth, mobile and
 * salary stay behind the same line the browse card draws. An employer who needs to reach
 * someone does it through the resume the candidate chose to publish.
 */
export interface CandidateDetail extends CandidateBrowseItem {
  readonly experience: readonly Experience[];
  readonly education: readonly Education[];
  readonly projects: readonly Project[];
  readonly certifications: readonly Certification[];
}

/** The four section readers an employer-facing candidate view composes (ISP). */
export interface CandidateSectionReaders {
  readonly experience: IOwnedResourceLister<Experience>;
  readonly education: IOwnedResourceLister<Education>;
  readonly project: IOwnedResourceLister<Project>;
  readonly certification: IOwnedResourceLister<Certification>;
}

/** Employer-facing reads of the candidate pool, separate from a candidate's own profile. */
export interface ICandidateDirectoryService {
  browse(query: CandidateQueryInput): Promise<CandidateListResult>;
  getDetail(userId: string): Promise<CandidateDetail>;
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
}

export const CANDIDATE_PROFILE_REPOSITORY: Token<ICandidateProfileRepository> = createToken(
  'ICandidateProfileRepository',
);
export const CANDIDATE_PROFILE_SERVICE: Token<ICandidateProfileService> = createToken(
  'ICandidateProfileService',
);
export const CANDIDATE_DIRECTORY_SERVICE: Token<ICandidateDirectoryService> = createToken(
  'ICandidateDirectoryService',
);
