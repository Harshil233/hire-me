import { NotFoundError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import type { CreateHrProfileData, HrProfile, IHrProfileRepository, IHrProfileService } from './hr.interface';
import type { UpdateHrProfileInput } from './hr.schema';

export class HrProfileService implements IHrProfileService {
  constructor(private readonly repository: IHrProfileRepository) {}

  createForUser(
    userId: string,
    data: CreateHrProfileData,
    context?: TransactionContext,
  ): Promise<HrProfile> {
    return this.repository.create(userId, data, context);
  }

  async getByUserId(userId: string): Promise<HrProfile> {
    const profile = await this.repository.findByUserId(userId);

    if (profile === null) {
      throw new NotFoundError('HR profile not found', ERROR_CODES.PROFILE_NOT_FOUND);
    }

    return profile;
  }

  async update(userId: string, data: UpdateHrProfileInput): Promise<HrProfile> {
    const updated = await this.repository.update(userId, data);

    if (updated === null) {
      throw new NotFoundError('HR profile not found', ERROR_CODES.PROFILE_NOT_FOUND);
    }

    return updated;
  }
}
