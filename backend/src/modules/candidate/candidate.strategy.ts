import { ROLES, type Role } from '../../config/constants';
import type { IOwnedResourceCounter } from '../../common/persistence/owned-resource.types';
import type { AnyProfileView, ICompletionCalculator, IProfileStrategy } from '../profile/profile.interface';
import type { CandidateCompletionSubject, CandidateSectionCounts } from './candidate.completion';
import type { CandidateProfile, ICandidateProfileService } from './candidate.interface';
import { toCandidateProfileResponse } from './candidate.mapper';
import {
  updateCandidateProfileSchema,
  type UpdateCandidateProfileInput,
} from './candidate.schema';

export interface CandidateSectionCounters {
  readonly experience: IOwnedResourceCounter;
  readonly education: IOwnedResourceCounter;
  readonly project: IOwnedResourceCounter;
  readonly certification: IOwnedResourceCounter;
}

/** Strategy: the candidate half of `GET /profile` and `PUT /profile`. */
export class CandidateProfileStrategy implements IProfileStrategy<UpdateCandidateProfileInput> {
  readonly role: Role = ROLES.CANDIDATE;
  readonly updateSchema = updateCandidateProfileSchema;

  constructor(
    private readonly profileService: ICandidateProfileService,
    private readonly counters: CandidateSectionCounters,
    private readonly completionCalculator: ICompletionCalculator<CandidateCompletionSubject>,
  ) {}

  async getProfile(userId: string): Promise<AnyProfileView> {
    const profile = await this.profileService.getByUserId(userId);
    return this.toView(profile);
  }

  async updateProfile(
    userId: string,
    input: UpdateCandidateProfileInput,
  ): Promise<AnyProfileView> {
    const profile = await this.profileService.update(userId, input);
    return this.toView(profile);
  }

  private async toView(profile: CandidateProfile): Promise<AnyProfileView> {
    const counts = await this.countSections(profile.userId);

    return {
      role: this.role,
      profile: toCandidateProfileResponse(profile),
      completion: this.completionCalculator.calculate({ profile, counts }),
    };
  }

  private async countSections(userId: string): Promise<CandidateSectionCounts> {
    const [experience, education, project, certification] = await Promise.all([
      this.counters.experience.countByUser(userId),
      this.counters.education.countByUser(userId),
      this.counters.project.countByUser(userId),
      this.counters.certification.countByUser(userId),
    ]);

    return { experience, education, project, certification };
  }
}
