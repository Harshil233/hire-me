import { ROLES, type Role } from '../../config/constants';
import type { Company, ICompanyService } from '../company/company.interface';
import type {
  AnyProfileView,
  ICompletionCalculator,
  IProfileStrategy,
} from '../profile/profile.interface';
import type { HrCompletionSubject } from './hr.completion';
import type { HrProfile, IHrProfileService } from './hr.interface';
import { toHrProfileResponse } from './hr.mapper';
import { updateHrProfileSchema, type UpdateHrProfileInput } from './hr.schema';

/** Strategy: the HR half of `GET /profile` and `PUT /profile`. */
export class HrProfileStrategy implements IProfileStrategy<UpdateHrProfileInput> {
  readonly role: Role = ROLES.HR;
  readonly updateSchema = updateHrProfileSchema;

  constructor(
    private readonly profileService: IHrProfileService,
    private readonly companyService: ICompanyService,
    private readonly completionCalculator: ICompletionCalculator<HrCompletionSubject>,
  ) {}

  async getProfile(userId: string): Promise<AnyProfileView> {
    const profile = await this.profileService.getByUserId(userId);
    return this.toView(profile);
  }

  async updateProfile(userId: string, input: UpdateHrProfileInput): Promise<AnyProfileView> {
    const profile = await this.profileService.update(userId, input);
    return this.toView(profile);
  }

  private async toView(profile: HrProfile): Promise<AnyProfileView> {
    const company =
      profile.companyId === undefined ? null : await this.loadCompany(profile.companyId);

    return {
      role: this.role,
      profile: toHrProfileResponse(profile, company),
      completion: this.completionCalculator.calculate({ profile, company }),
    };
  }

  /** A deleted company must not break the profile page, so a miss degrades to `null`. */
  private async loadCompany(companyId: string): Promise<Company | null> {
    try {
      return await this.companyService.getById(companyId);
    } catch {
      return null;
    }
  }
}
