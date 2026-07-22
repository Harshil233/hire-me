import { COMPANY_ROLES, type CompanyRole } from '../../config/constants';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import type { ICompanyMembership } from '../company/company.interface';
import type { IHrProfileRepository } from './hr.interface';

/**
 * Adapter that implements the company module's membership port on top of `hr_profiles`,
 * so the company module never learns that HR profiles exist (CLAUDE.md §5, §7).
 */
export class HrCompanyMembershipAdapter implements ICompanyMembership {
  constructor(private readonly hrProfileRepository: IHrProfileRepository) {}

  async findCompanyIdForUser(userId: string): Promise<string | null> {
    const profile = await this.hrProfileRepository.findByUserId(userId);
    return profile?.companyId ?? null;
  }

  async attachCompany(
    userId: string,
    companyId: string,
    role: CompanyRole,
    context?: TransactionContext,
  ): Promise<void> {
    await this.hrProfileRepository.setCompany(userId, companyId, role, context);
  }

  async canManageCompany(userId: string, companyId: string): Promise<boolean> {
    const profile = await this.hrProfileRepository.findByUserId(userId);

    return (
      profile !== null &&
      profile.companyId === companyId &&
      profile.companyRole === COMPANY_ROLES.OWNER
    );
  }
}
