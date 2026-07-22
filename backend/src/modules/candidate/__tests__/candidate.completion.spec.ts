import { describe, expect, it } from 'vitest';

import { CANDIDATE_COMPLETION_WEIGHTS } from '../../../config/constants';
import {
  CandidateCompletionCalculator,
  type CandidateCompletionSubject,
} from '../candidate.completion';
import type { CandidateProfile } from '../candidate.interface';

const EMPTY_PROFILE: CandidateProfile = {
  id: 'profile-1',
  userId: 'user-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  preferredLocations: [],
  skills: [],
  jobTypes: [],
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const NO_SECTIONS = { experience: 0, education: 0, project: 0, certification: 0 };

const calculator = new CandidateCompletionCalculator();

const calculate = (subject: Partial<CandidateCompletionSubject> = {}) =>
  calculator.calculate({
    profile: subject.profile ?? EMPTY_PROFILE,
    counts: subject.counts ?? NO_SECTIONS,
  });

describe('CandidateCompletionCalculator', () => {
  it('weights a fresh account by its name alone', () => {
    const result = calculate();

    expect(result.percentage).toBe(CANDIDATE_COMPLETION_WEIGHTS.name);
    expect(result.totalWeight).toBe(100);
  });

  it('reaches 100% for a fully populated profile', () => {
    const result = calculate({
      profile: {
        ...EMPTY_PROFILE,
        profilePicFileId: 'file-1',
        mobile: { countryCode: '+91', number: '9876543210' },
        gender: 'female',
        dob: new Date('1990-01-01T00:00:00.000Z'),
        currentLocation: 'Pune',
        preferredLocations: ['Pune'],
        skills: ['TypeScript'],
        jobTypes: ['full_time'],
        expectedCtc: 1_500_000,
        resumeFileId: 'file-2',
      },
      counts: { experience: 1, education: 1, project: 1, certification: 1 },
    });

    expect(result.percentage).toBe(100);
    expect(result.missing).toEqual([]);
  });

  it('lists what is still missing', () => {
    const missingKeys = calculate().missing.map((item) => item.key);

    expect(missingKeys).toContain('resume');
    expect(missingKeys).toContain('experience');
    expect(missingKeys).not.toContain('name');
  });

  it('credits sections only when they have at least one entry', () => {
    const withExperience = calculate({ counts: { ...NO_SECTIONS, experience: 2 } });

    expect(withExperience.percentage).toBe(
      CANDIDATE_COMPLETION_WEIGHTS.name + CANDIDATE_COMPLETION_WEIGHTS.experience,
    );
  });

  it('does not credit an empty skills list', () => {
    const withSkills = calculate({ profile: { ...EMPTY_PROFILE, skills: ['Go'] } });
    const withoutSkills = calculate();

    expect(withSkills.percentage - withoutSkills.percentage).toBe(
      CANDIDATE_COMPLETION_WEIGHTS.skills,
    );
  });

  it('does not credit a blank first or last name', () => {
    const result = calculate({ profile: { ...EMPTY_PROFILE, lastName: '   ' } });

    expect(result.percentage).toBe(0);
  });

  it('is deterministic', () => {
    expect(calculate()).toEqual(calculate());
  });
});
