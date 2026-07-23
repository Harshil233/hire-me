import { describe, expect, it, vi } from 'vitest';

import type { CandidateProfile, ICandidateProfileRepository } from '../candidate.interface';
import { CandidateDirectoryAdapter } from '../candidate-directory.adapter';

const NOW = new Date('2026-03-01T10:00:00.000Z');

const profile = (overrides: Partial<CandidateProfile> = {}): CandidateProfile => ({
  id: 'profile-1',
  userId: 'candidate-1',
  isOpenToOutreach: true,
  firstName: 'Ada',
  lastName: 'Lovelace',
  preferredLocations: ['Pune'],
  skills: ['TypeScript'],
  jobTypes: ['full_time'],
  currentLocation: 'Pune',
  profilePicFileId: 'file-1',
  // Fields an employer must not receive through this port.
  dob: new Date('1990-01-01T00:00:00.000Z'),
  expectedCtc: 2_500_000,
  currentCtc: 1_800_000,
  mobile: { countryCode: '+91', number: '9876543210' },
  resumeFileId: 'resume-1',
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const createAdapter = (
  profiles: CandidateProfile[],
): { adapter: CandidateDirectoryAdapter; repository: ICandidateProfileRepository } => {
  const repository = {
    findByUserId: vi.fn(async () => profiles[0] ?? null),
    findManyByUserIds: vi.fn(async () => profiles),
    create: vi.fn(),
    update: vi.fn(),
  } as unknown as ICandidateProfileRepository;

  return { adapter: new CandidateDirectoryAdapter(repository), repository };
};

describe('CandidateDirectoryAdapter', () => {
  it('builds a display name from the profile parts', async () => {
    const { adapter } = createAdapter([profile({ middleName: 'B' })]);

    const summaries = await adapter.findSummaries(['candidate-1']);

    expect(summaries.get('candidate-1')?.fullName).toBe('Ada B Lovelace');
  });

  it('exposes only the applicant-card fields', async () => {
    const { adapter } = createAdapter([profile()]);

    const summary = await adapter.findSummaries(['candidate-1']);

    expect(Object.keys(summary.get('candidate-1') ?? {}).sort()).toEqual([
      'currentLocation',
      'fullName',
      'profilePicFileId',
      'skills',
      'userId',
    ]);
  });

  it.each([['dob'], ['expectedCtc'], ['currentCtc'], ['mobile'], ['resumeFileId']])(
    'never leaks %s to an employer',
    async (field) => {
      const { adapter } = createAdapter([profile()]);

      const summary = await adapter.findSummaries(['candidate-1']);

      expect(summary.get('candidate-1')).not.toHaveProperty(field);
    },
  );

  it('deduplicates ids before hitting the repository', async () => {
    const { adapter, repository } = createAdapter([profile()]);

    await adapter.findSummaries(['candidate-1', 'candidate-1']);

    expect(repository.findManyByUserIds).toHaveBeenCalledWith(['candidate-1']);
  });

  it('omits a user that has no profile rather than inventing one', async () => {
    const { adapter } = createAdapter([]);

    const summaries = await adapter.findSummaries(['ghost']);

    expect(summaries.size).toBe(0);
  });
});
