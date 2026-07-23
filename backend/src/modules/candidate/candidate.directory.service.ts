import { NotFoundError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { toPaginationMeta } from '../../common/http/api-response';
import { fullName } from '../../common/utils/name';
import type {
  CandidateBrowseItem,
  CandidateDetail,
  CandidateListResult,
  CandidateProfile,
  CandidateSectionReaders,
  ICandidateDirectoryService,
  ICandidateProfileRepository,
} from './candidate.interface';
import type { CandidateQueryInput } from './candidate.schema';

/**
 * The employer's view of the candidate pool. Kept apart from `CandidateProfileService`,
 * which owns a candidate's own profile: the two answer to different people and change
 * for different reasons (CLAUDE.md §3, SRP).
 */
export class CandidateDirectoryService implements ICandidateDirectoryService {
  constructor(
    private readonly repository: ICandidateProfileRepository,
    private readonly sections: CandidateSectionReaders,
  ) {}

  async browse(query: CandidateQueryInput): Promise<CandidateListResult> {
    const { page, pageSize, ...filter } = query;

    const result = await this.repository.search(filter, page, pageSize);

    return {
      candidates: result.items.map((profile) => CandidateDirectoryService.toBrowseItem(profile)),
      pagination: toPaginationMeta(result.total, page, pageSize),
    };
  }

  async getDetail(userId: string): Promise<CandidateDetail> {
    const profile = await this.repository.findByUserId(userId);

    if (profile === null) {
      throw new NotFoundError('Candidate not found', ERROR_CODES.PROFILE_NOT_FOUND);
    }

    // Four independent reads; there is no reason to make them wait for each other.
    const [experience, education, projects, certifications] = await Promise.all([
      this.sections.experience.list(userId),
      this.sections.education.list(userId),
      this.sections.project.list(userId),
      this.sections.certification.list(userId),
    ]);

    return {
      ...CandidateDirectoryService.toBrowseItem(profile),
      experience,
      education,
      projects,
      certifications,
    };
  }

  /**
   * Narrows a profile to what an employer may see. Date of birth, mobile and salary are
   * dropped here, once, so no caller can leak them by accident.
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
