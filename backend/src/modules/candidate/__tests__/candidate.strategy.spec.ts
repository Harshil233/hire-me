import { describe, expect, it, vi } from 'vitest';

import { ROLES } from '../../../config/constants';
import type { IOwnedResourceCounter } from '../../../common/persistence/owned-resource.types';
import type { ICompletionCalculator } from '../../profile/profile.interface';
import type { CandidateCompletionSubject } from '../candidate.completion';
import type { CandidateProfile, ICandidateProfileService } from '../candidate.interface';
import { CandidateProfileStrategy } from '../candidate.strategy';
import type { CandidateProfileResponse } from '../candidate.schema';

const PROFILE: CandidateProfile = {
  id: 'profile-1',
  userId: 'user-1',
  isOpenToOutreach: true,
  firstName: 'Ada',
  lastName: 'Lovelace',
  preferredLocations: ['Pune'],
  skills: ['TypeScript'],
  jobTypes: ['full_time'],
  dob: new Date('1990-05-04T00:00:00.000Z'),
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

const COMPLETION = {
  percentage: 42,
  completedWeight: 42,
  totalWeight: 100,
  items: [],
  missing: [],
};

const counter = (count: number): IOwnedResourceCounter => ({
  countByUser: vi.fn(async () => count),
});

const createStrategy = (): {
  strategy: CandidateProfileStrategy;
  profileService: ICandidateProfileService;
  calculator: ICompletionCalculator<CandidateCompletionSubject>;
} => {
  const profileService: ICandidateProfileService = {
    createForUser: vi.fn(async () => PROFILE),
    getByUserId: vi.fn(async () => PROFILE),
    update: vi.fn(async () => PROFILE),
  };

  const calculator: ICompletionCalculator<CandidateCompletionSubject> = {
    calculate: vi.fn(() => COMPLETION),
  };

  const strategy = new CandidateProfileStrategy(
    profileService,
    {
      experience: counter(2),
      education: counter(1),
      project: counter(0),
      certification: counter(3),
    },
    calculator,
  );

  return { strategy, profileService, calculator };
};

describe('CandidateProfileStrategy', () => {
  it('declares the candidate role and its update schema', () => {
    const { strategy } = createStrategy();

    expect(strategy.role).toBe(ROLES.CANDIDATE);
    expect(strategy.updateSchema.safeParse({ firstName: 'Ada' }).success).toBe(true);
  });

  it('returns the serialised profile with its completion', async () => {
    const { strategy } = createStrategy();

    const view = await strategy.getProfile('user-1');

    expect(view.role).toBe(ROLES.CANDIDATE);
    expect(view.completion).toBe(COMPLETION);
    expect((view.profile as CandidateProfileResponse).firstName).toBe('Ada');
    expect((view.profile as CandidateProfileResponse).dob).toBe('1990-05-04T00:00:00.000Z');
  });

  it('feeds live section counts into the calculator', async () => {
    const { strategy, calculator } = createStrategy();

    await strategy.getProfile('user-1');

    expect(calculator.calculate).toHaveBeenCalledWith({
      profile: PROFILE,
      counts: { experience: 2, education: 1, project: 0, certification: 3 },
    });
  });

  it('updates then re-scores the profile', async () => {
    const { strategy, profileService, calculator } = createStrategy();

    const view = await strategy.updateProfile('user-1', { firstName: 'Grace' });

    expect(profileService.update).toHaveBeenCalledWith('user-1', { firstName: 'Grace' });
    expect(calculator.calculate).toHaveBeenCalledOnce();
    expect(view.completion).toBe(COMPLETION);
  });

  it('propagates a missing profile', async () => {
    const { strategy, profileService } = createStrategy();
    vi.mocked(profileService.getByUserId).mockRejectedValue(new Error('not found'));

    await expect(strategy.getProfile('ghost')).rejects.toThrow('not found');
  });
});
