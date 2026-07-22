import { describe, expect, it, vi } from 'vitest';

import { COMPANY_ROLES } from '../../../config/constants';
import type { TransactionContext } from '../../../common/persistence/transaction.types';
import { HrCompanyMembershipAdapter } from '../hr-company-membership.adapter';
import type { HrProfile, IHrProfileRepository } from '../hr.interface';

const PROFILE: HrProfile = {
  id: 'profile-1',
  userId: 'user-1',
  companyId: 'company-1',
  companyRole: COMPANY_ROLES.OWNER,
  firstName: 'Grace',
  lastName: 'Hopper',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const createRepository = (
  overrides: Partial<IHrProfileRepository> = {},
): IHrProfileRepository => ({
  findByUserId: vi.fn(async () => PROFILE),
  create: vi.fn(async () => PROFILE),
  update: vi.fn(async () => PROFILE),
  setCompany: vi.fn(async () => undefined),
  ...overrides,
});

describe('HrCompanyMembershipAdapter', () => {
  it('reports the linked company id', async () => {
    await expect(
      new HrCompanyMembershipAdapter(createRepository()).findCompanyIdForUser('user-1'),
    ).resolves.toBe('company-1');
  });

  it('reports null when the user has no HR profile', async () => {
    const repository = createRepository({ findByUserId: vi.fn(async () => null) });

    await expect(
      new HrCompanyMembershipAdapter(repository).findCompanyIdForUser('user-1'),
    ).resolves.toBeNull();
  });

  it('attaches a company, forwarding the transaction context', async () => {
    const repository = createRepository();
    const context: TransactionContext = { transactionId: 'txn-1' };

    await new HrCompanyMembershipAdapter(repository).attachCompany(
      'user-1',
      'company-2',
      COMPANY_ROLES.OWNER,
      context,
    );

    expect(repository.setCompany).toHaveBeenCalledWith(
      'user-1',
      'company-2',
      COMPANY_ROLES.OWNER,
      context,
    );
  });

  it('lets an owner manage their own company', async () => {
    await expect(
      new HrCompanyMembershipAdapter(createRepository()).canManageCompany('user-1', 'company-1'),
    ).resolves.toBe(true);
  });

  it('refuses a member who is not an owner', async () => {
    const repository = createRepository({
      findByUserId: vi.fn(async () => ({ ...PROFILE, companyRole: COMPANY_ROLES.MEMBER })),
    });

    await expect(
      new HrCompanyMembershipAdapter(repository).canManageCompany('user-1', 'company-1'),
    ).resolves.toBe(false);
  });

  it('refuses an owner of a different company', async () => {
    await expect(
      new HrCompanyMembershipAdapter(createRepository()).canManageCompany('user-1', 'company-9'),
    ).resolves.toBe(false);
  });

  it('refuses a user without an HR profile', async () => {
    const repository = createRepository({ findByUserId: vi.fn(async () => null) });

    await expect(
      new HrCompanyMembershipAdapter(repository).canManageCompany('user-1', 'company-1'),
    ).resolves.toBe(false);
  });
});
