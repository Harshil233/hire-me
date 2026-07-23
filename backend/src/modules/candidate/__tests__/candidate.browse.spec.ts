import { describe, expect, it, vi } from 'vitest';

import { PAGINATION } from '../../../config/constants';
import { CandidateProfileService } from '../candidate.service';
import { candidateQuerySchema } from '../candidate.schema';
import type { CandidateProfile, ICandidateProfileRepository } from '../candidate.interface';

const NOW = new Date('2026-03-01T10:00:00.000Z');

const PROFILE: CandidateProfile = {
  id: 'profile-1',
  userId: 'candidate-1',
  firstName: 'Ada',
  middleName: 'B',
  lastName: 'Lovelace',
  currentLocation: 'Pune',
  preferredLocations: ['Pune', 'Remote'],
  skills: ['TypeScript', 'Node.js'],
  jobTypes: ['full_time'],
  profilePicFileId: 'file-1',
  resumeFileId: 'resume-1',
  // Must never appear in a browse result.
  dob: new Date('1990-01-01T00:00:00.000Z'),
  mobile: { countryCode: '+91', number: '9876543210' },
  currentCtc: 1_600_000,
  expectedCtc: 2_400_000,
  createdAt: NOW,
  updatedAt: NOW,
};

const QUERY = { page: PAGINATION.DEFAULT_PAGE, pageSize: PAGINATION.DEFAULT_PAGE_SIZE };

const createHarness = (): {
  service: CandidateProfileService;
  repository: ICandidateProfileRepository;
} => {
  const repository: ICandidateProfileRepository = {
    findByUserId: vi.fn(async () => PROFILE),
    findManyByUserIds: vi.fn(async () => [PROFILE]),
    search: vi.fn(async () => ({ items: [PROFILE], total: 1 })),
    create: vi.fn(async () => PROFILE),
    update: vi.fn(async () => PROFILE),
  };

  return { service: new CandidateProfileService(repository), repository };
};

describe('CandidateProfileService.browse', () => {
  it('returns browse cards with a display name built from the parts', async () => {
    const { service } = createHarness();

    const result = await service.browse(QUERY);

    expect(result.candidates[0]?.fullName).toBe('Ada B Lovelace');
    expect(result.pagination).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 });
  });

  it('exposes only the browse fields', async () => {
    const { service } = createHarness();

    const result = await service.browse(QUERY);

    expect(Object.keys(result.candidates[0] ?? {}).sort()).toEqual([
      'currentLocation',
      'fullName',
      'jobTypes',
      'preferredLocations',
      'profilePicFileId',
      'resumeFileId',
      'skills',
      'userId',
    ]);
  });

  it.each([['dob'], ['mobile'], ['currentCtc'], ['expectedCtc'], ['firstName']])(
    'never discloses %s to a browsing employer',
    async (field) => {
      const { service } = createHarness();

      const result = await service.browse(QUERY);

      expect(result.candidates[0]).not.toHaveProperty(field);
    },
  );

  it('never forwards the paging keys as filter fields', async () => {
    const { service, repository } = createHarness();

    await service.browse({ ...QUERY, search: 'ada' });

    const [filter] = vi.mocked(repository.search).mock.calls[0] ?? [];
    expect(filter).toEqual({ search: 'ada' });
  });

  it('passes the filters through untouched', async () => {
    const { service, repository } = createHarness();

    await service.browse({ ...QUERY, skills: ['TypeScript'], location: 'Pune', jobType: 'full_time' });

    expect(repository.search).toHaveBeenCalledWith(
      { skills: ['TypeScript'], location: 'Pune', jobType: 'full_time' },
      PAGINATION.DEFAULT_PAGE,
      PAGINATION.DEFAULT_PAGE_SIZE,
    );
  });

  it('handles an empty pool', async () => {
    const { service, repository } = createHarness();
    vi.mocked(repository.search).mockResolvedValue({ items: [], total: 0 });

    const result = await service.browse(QUERY);

    expect(result.candidates).toEqual([]);
    expect(result.pagination.totalPages).toBe(1);
  });
});

describe('candidateQuerySchema', () => {
  it('defaults the paging window', () => {
    expect(candidateQuerySchema.parse({})).toMatchObject({
      page: PAGINATION.DEFAULT_PAGE,
      pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
    });
  });

  it('splits a comma-separated skills list', () => {
    expect(candidateQuerySchema.parse({ skills: 'TypeScript, Node.js ,' }).skills).toEqual([
      'TypeScript',
      'Node.js',
    ]);
  });

  it('caps the page size', () => {
    expect(
      candidateQuerySchema.safeParse({ pageSize: String(PAGINATION.MAX_PAGE_SIZE + 1) }).success,
    ).toBe(false);
  });

  it.each([
    ['search', { $ne: '' }],
    ['location', { $ne: null }],
    ['jobType', { $ne: 'full_time' }],
  ])('rejects an operator object supplied as %s', (field, value) => {
    expect(candidateQuerySchema.safeParse({ [field]: value }).success).toBe(false);
  });

  it('rejects an unknown job type', () => {
    expect(candidateQuerySchema.safeParse({ jobType: 'permanent' }).success).toBe(false);
  });
});
