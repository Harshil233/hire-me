import { NotFoundError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { toPaginationMeta } from '../../common/http/api-response';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import { fullName } from '../../common/utils/name';
import type {
  CandidateBrowseItem,
  CandidateListResult,
  CandidateProfile,
  ICandidateProfileRepository,
  ICandidateProfileService,
} from './candidate.interface';
import type {
  CandidateQueryInput,
  CreateCandidateProfileInput,
  UpdateCandidateProfileInput,
} from './candidate.schema';

export class CandidateProfileService implements ICandidateProfileService {
  constructor(private readonly repository: ICandidateProfileRepository) {}

  createForUser(
    userId: string,
    data: CreateCandidateProfileInput,
    context?: TransactionContext,
  ): Promise<CandidateProfile> {
    return this.repository.create(userId, data, context);
  }

  async getByUserId(userId: string): Promise<CandidateProfile> {
    const profile = await this.repository.findByUserId(userId);

    if (profile === null) {
      throw new NotFoundError('Candidate profile not found', ERROR_CODES.PROFILE_NOT_FOUND);
    }

    return profile;
  }

  async update(
    userId: string,
    data: UpdateCandidateProfileInput,
  ): Promise<CandidateProfile> {
    const updated = await this.repository.update(userId, data);

    if (updated === null) {
      throw new NotFoundError('Candidate profile not found', ERROR_CODES.PROFILE_NOT_FOUND);
    }

    return updated;
  }

  async browse(query: CandidateQueryInput): Promise<CandidateListResult> {
    const { page, pageSize, ...filter } = query;

    const result = await this.repository.search(filter, page, pageSize);

    return {
      candidates: result.items.map((profile) => CandidateProfileService.toBrowseItem(profile)),
      pagination: toPaginationMeta(result.total, page, pageSize),
    };
  }

  /**
   * Narrows a profile to what an employer browsing may see. Date of birth, mobile and
   * salary expectations are dropped here, once, so no caller can leak them by accident.
   */
  private static toBrowseItem(profile: CandidateProfile): CandidateBrowseItem {
    return {
      userId: profile.userId,
      fullName: fullName(profile),
      currentLocation: profile.currentLocation,
      preferredLocations: [...profile.preferredLocations],
      skills: [...profile.skills],
      jobTypes: [...profile.jobTypes],
      profilePicFileId: profile.profilePicFileId,
      resumeFileId: profile.resumeFileId,
    };
  }
}
