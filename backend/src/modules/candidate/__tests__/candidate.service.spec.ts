import { describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '../../../common/errors/error-codes';
import type { TransactionContext } from '../../../common/persistence/transaction.types';
import { CandidateProfileService } from '../candidate.service';
import type { CandidateProfile, ICandidateProfileRepository } from '../candidate.interface';

const PROFILE: CandidateProfile = {
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

const createRepository = (
  overrides: Partial<ICandidateProfileRepository> = {},
): ICandidateProfileRepository => ({
  findByUserId: vi.fn(async () => PROFILE),
  findManyByUserIds: vi.fn(async () => [PROFILE]),
  search: vi.fn(async () => ({ items: [PROFILE], total: 1 })),
  create: vi.fn(async () => PROFILE),
  update: vi.fn(async () => PROFILE),
  ...overrides,
});

describe('CandidateProfileService', () => {
  it('creates a profile inside the caller’s transaction', async () => {
    const repository = createRepository();
    const context: TransactionContext = { transactionId: 'txn-1' };

    await new CandidateProfileService(repository).createForUser(
      'user-1',
      { firstName: 'Ada', lastName: 'Lovelace' },
      context,
    );

    expect(repository.create).toHaveBeenCalledWith(
      'user-1',
      { firstName: 'Ada', lastName: 'Lovelace' },
      context,
    );
  });

  it('reads the profile for a user', async () => {
    await expect(
      new CandidateProfileService(createRepository()).getByUserId('user-1'),
    ).resolves.toEqual(PROFILE);
  });

  it('throws a 404 when the profile is missing', async () => {
    const repository = createRepository({ findByUserId: vi.fn(async () => null) });

    await expect(
      new CandidateProfileService(repository).getByUserId('user-1'),
    ).rejects.toMatchObject({ statusCode: 404, code: ERROR_CODES.PROFILE_NOT_FOUND });
  });

  it('updates the profile', async () => {
    const repository = createRepository();

    await new CandidateProfileService(repository).update('user-1', { firstName: 'Grace' });

    expect(repository.update).toHaveBeenCalledWith('user-1', { firstName: 'Grace' });
  });

  it('throws a 404 when updating a profile that does not exist', async () => {
    const repository = createRepository({ update: vi.fn(async () => null) });

    await expect(
      new CandidateProfileService(repository).update('ghost', { firstName: 'Grace' }),
    ).rejects.toMatchObject({ statusCode: 404, code: ERROR_CODES.PROFILE_NOT_FOUND });
  });
});
