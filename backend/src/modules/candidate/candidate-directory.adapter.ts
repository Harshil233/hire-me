import { fullName } from '../../common/utils/name';
import type {
  CandidateSummary,
  ICandidateDirectory,
} from '../application/application.interface';
import type { ICandidateProfileRepository } from './candidate.interface';

/**
 * Adapter implementing the application module's directory port on top of candidate
 * profiles. It deliberately narrows: an employer reviewing applicants receives a card,
 * not the candidate's date of birth, salary expectations or contact details
 * (CLAUDE.md §3, ISP). Mirrors `HrCompanyMembershipAdapter`.
 */
export class CandidateDirectoryAdapter implements ICandidateDirectory {
  constructor(private readonly candidateProfileRepository: ICandidateProfileRepository) {}

  async findSummaries(
    userIds: readonly string[],
  ): Promise<ReadonlyMap<string, CandidateSummary>> {
    const unique = [...new Set(userIds)];
    const profiles = await this.candidateProfileRepository.findManyByUserIds(unique);

    return new Map(
      profiles.map((profile) => [
        profile.userId,
        {
          userId: profile.userId,
          fullName: fullName(profile),
          currentLocation: profile.currentLocation,
          skills: [...profile.skills],
          profilePicFileId: profile.profilePicFileId,
          // Deliberately absent: dob, mobile, CTC expectations and preferred locations.
        },
      ]),
    );
  }
}
