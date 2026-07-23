import { PAGINATION } from '../../config/constants';
import type { AudienceMember, ICandidateAudience } from '../outreach/outreach.interface';
import type { CandidateFilter, ICandidateProfileRepository } from './candidate.interface';

/**
 * Adapter implementing the outreach module's audience port on top of the candidate
 * repository, so outreach never learns how candidates are stored (CLAUDE.md §5, §7).
 *
 * Consent is applied here rather than left to the caller: whichever way an audience is
 * chosen, someone who opted out of employer email is not in it.
 */
export class CandidateAudienceAdapter implements ICandidateAudience {
  constructor(private readonly repository: ICandidateProfileRepository) {}

  async findByFilter(filter: CandidateFilter, limit: number): Promise<AudienceMember[]> {
    const capped = Math.min(limit, PAGINATION.MAX_PAGE_SIZE);
    const collected: AudienceMember[] = [];

    // Paged, because the cap on a campaign is larger than one page of results.
    for (let page = 1; collected.length < limit; page += 1) {
      const { items } = await this.repository.search(filter, page, capped);

      if (items.length === 0) {
        break;
      }

      for (const profile of items) {
        if (profile.isOpenToOutreach) {
          collected.push({ userId: profile.userId, firstName: profile.firstName });
        }
      }

      if (items.length < capped) {
        break;
      }
    }

    return collected.slice(0, limit);
  }

  async findByUserIds(userIds: readonly string[]): Promise<AudienceMember[]> {
    const profiles = await this.repository.findManyByUserIds(userIds);

    return profiles
      .filter((profile) => profile.isOpenToOutreach)
      .map((profile) => ({ userId: profile.userId, firstName: profile.firstName }));
  }
}
