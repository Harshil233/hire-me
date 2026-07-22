import { describe, expect, it, vi } from 'vitest';

import { COMPANY_ROLES } from '../../../config/constants';
import { ERROR_CODES } from '../../../common/errors/error-codes';
import { HrProfileService } from '../hr.service';
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

describe('HrProfileService', () => {
  it('creates a profile with its company link', async () => {
    const repository = createRepository();

    await new HrProfileService(repository).createForUser('user-1', {
      firstName: 'Grace',
      lastName: 'Hopper',
      companyId: 'company-1',
      companyRole: COMPANY_ROLES.OWNER,
    });

    expect(repository.create).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ companyId: 'company-1', companyRole: COMPANY_ROLES.OWNER }),
      undefined,
    );
  });

  it('reads a profile', async () => {
    await expect(new HrProfileService(createRepository()).getByUserId('user-1')).resolves.toEqual(
      PROFILE,
    );
  });

  it('throws a 404 when the profile is missing', async () => {
    const repository = createRepository({ findByUserId: vi.fn(async () => null) });

    await expect(new HrProfileService(repository).getByUserId('ghost')).rejects.toMatchObject({
      statusCode: 404,
      code: ERROR_CODES.PROFILE_NOT_FOUND,
    });
  });

  it('updates a profile', async () => {
    const repository = createRepository();

    await new HrProfileService(repository).update('user-1', { designation: 'Talent Lead' });

    expect(repository.update).toHaveBeenCalledWith('user-1', { designation: 'Talent Lead' });
  });

  it('throws a 404 when updating a missing profile', async () => {
    const repository = createRepository({ update: vi.fn(async () => null) });

    await expect(
      new HrProfileService(repository).update('ghost', { designation: 'x' }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
