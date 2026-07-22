import { describe, expect, it, vi } from 'vitest';

import { COMPANY_ROLES, ROLES } from '../../../config/constants';
import { NotFoundError } from '../../../common/errors/app-error';
import type { Company, ICompanyService } from '../../company/company.interface';
import type { ICompletionCalculator } from '../../profile/profile.interface';
import type { HrCompletionSubject } from '../hr.completion';
import type { HrProfile, IHrProfileService } from '../hr.interface';
import { HrProfileStrategy } from '../hr.strategy';
import type { HrProfileResponse } from '../hr.schema';

const PROFILE: HrProfile = {
  id: 'profile-1',
  userId: 'user-1',
  companyId: 'company-1',
  companyRole: COMPANY_ROLES.OWNER,
  firstName: 'Grace',
  lastName: 'Hopper',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

const COMPANY: Company = {
  id: 'company-1',
  name: 'Acme',
  slug: 'acme',
  locations: ['Pune'],
  createdByUserId: 'user-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const COMPLETION = {
  percentage: 55,
  completedWeight: 55,
  totalWeight: 100,
  items: [],
  missing: [],
};

const createStrategy = (): {
  strategy: HrProfileStrategy;
  profileService: IHrProfileService;
  companyService: ICompanyService;
  calculator: ICompletionCalculator<HrCompletionSubject>;
} => {
  const profileService: IHrProfileService = {
    createForUser: vi.fn(async () => PROFILE),
    getByUserId: vi.fn(async () => PROFILE),
    update: vi.fn(async () => PROFILE),
  };

  const companyService: ICompanyService = {
    create: vi.fn(async () => COMPANY),
    registerForUser: vi.fn(async () => COMPANY),
    getById: vi.fn(async () => COMPANY),
    update: vi.fn(async () => COMPANY),
  };

  const calculator: ICompletionCalculator<HrCompletionSubject> = {
    calculate: vi.fn(() => COMPLETION),
  };

  return {
    strategy: new HrProfileStrategy(profileService, companyService, calculator),
    profileService,
    companyService,
    calculator,
  };
};

describe('HrProfileStrategy', () => {
  it('declares the HR role and its update schema', () => {
    const { strategy } = createStrategy();

    expect(strategy.role).toBe(ROLES.HR);
    expect(strategy.updateSchema.safeParse({ designation: 'Lead' }).success).toBe(true);
  });

  it('embeds the company in the profile view', async () => {
    const { strategy } = createStrategy();

    const view = await strategy.getProfile('user-1');
    const profile = view.profile as HrProfileResponse;

    expect(view.role).toBe(ROLES.HR);
    expect(profile.company?.name).toBe('Acme');
    expect(profile.companyRole).toBe(COMPANY_ROLES.OWNER);
    expect(view.completion).toBe(COMPLETION);
  });

  it('degrades to a null company rather than failing the page', async () => {
    const { strategy, companyService, calculator } = createStrategy();
    vi.mocked(companyService.getById).mockRejectedValue(new NotFoundError('gone'));

    const view = await strategy.getProfile('user-1');

    expect((view.profile as HrProfileResponse).company).toBeNull();
    expect(calculator.calculate).toHaveBeenCalledWith({ profile: PROFILE, company: null });
  });

  it('updates then re-scores', async () => {
    const { strategy, profileService } = createStrategy();

    await strategy.updateProfile('user-1', { designation: 'Head of Talent' });

    expect(profileService.update).toHaveBeenCalledWith('user-1', {
      designation: 'Head of Talent',
    });
  });
});
