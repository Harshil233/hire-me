import { describe, expect, it } from 'vitest';

import { COMPANY_ROLES, HR_COMPLETION_WEIGHTS } from '../../../config/constants';
import type { Company } from '../../company/company.interface';
import { HrCompletionCalculator } from '../hr.completion';
import type { HrProfile } from '../hr.interface';

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

const COMPANY: Company = {
  id: 'company-1',
  name: 'Acme',
  slug: 'acme',
  locations: [],
  createdByUserId: 'user-1',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const calculator = new HrCompletionCalculator();

describe('HrCompletionCalculator', () => {
  it('scores a bare profile with a company', () => {
    const result = calculator.calculate({ profile: PROFILE, company: COMPANY });

    expect(result.percentage).toBe(HR_COMPLETION_WEIGHTS.name + HR_COMPLETION_WEIGHTS.company);
    expect(result.totalWeight).toBe(100);
  });

  it('does not credit the company block when there is no company', () => {
    const result = calculator.calculate({ profile: PROFILE, company: null });

    expect(result.percentage).toBe(HR_COMPLETION_WEIGHTS.name);
    expect(result.missing.map((item) => item.key)).toContain('company');
  });

  it('reaches 100% when profile and company are complete', () => {
    const result = calculator.calculate({
      profile: {
        ...PROFILE,
        profilePicFileId: 'file-1',
        designation: 'Talent Lead',
        mobile: { countryCode: '+91', number: '9876543210' },
        gender: 'female',
        dob: new Date('1985-01-01T00:00:00.000Z'),
      },
      company: {
        ...COMPANY,
        description: 'We build things',
        logoFileId: 'file-2',
        websiteUrl: 'https://acme.test',
      },
    });

    expect(result.percentage).toBe(100);
    expect(result.missing).toEqual([]);
  });

  it('credits each company field independently', () => {
    const base = calculator.calculate({ profile: PROFILE, company: COMPANY }).percentage;
    const withWebsite = calculator.calculate({
      profile: PROFILE,
      company: { ...COMPANY, websiteUrl: 'https://acme.test' },
    }).percentage;

    expect(withWebsite - base).toBe(HR_COMPLETION_WEIGHTS.companyWebsite);
  });
});
