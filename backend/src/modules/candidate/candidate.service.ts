import { NotFoundError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import type {
  CandidateProfile,
  ICandidateProfileRepository,
  ICandidateProfileService,
} from './candidate.interface';
import type {
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
}
