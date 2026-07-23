import type { CompanySummary, ICompanyDirectory } from '../job/job.interface';
import type { ICompanyRepository } from './company.interface';

/**
 * Adapter implementing the job module's directory port on top of the company repository,
 * so the job module never learns how companies are stored (CLAUDE.md §5, §7).
 * Mirrors `HrCompanyMembershipAdapter`, which does the same in the other direction.
 */
export class CompanyDirectoryAdapter implements ICompanyDirectory {
  constructor(private readonly companyRepository: ICompanyRepository) {}

  async findIdsByName(term: string): Promise<string[]> {
    const companies = await this.companyRepository.searchByName(term);
    return companies.map((company) => company.id);
  }

  async findSummaries(ids: readonly string[]): Promise<ReadonlyMap<string, CompanySummary>> {
    const unique = [...new Set(ids)];
    const companies = await this.companyRepository.findManyByIds(unique);

    return new Map(
      companies.map((company) => [
        company.id,
        {
          id: company.id,
          name: company.name,
          slug: company.slug,
          logoFileId: company.logoFileId,
        },
      ]),
    );
  }
}
