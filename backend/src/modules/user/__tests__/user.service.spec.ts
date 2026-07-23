import { describe, expect, it, vi } from 'vitest';

import { ROLES } from '../../../config/constants';
import { ERROR_CODES } from '../../../common/errors/error-codes';
import { UserService } from '../user.service';
import type { IUserRepository, User } from '../user.interface';

const USER: User = {
  id: 'user-1',
  email: 'ada@example.com',
  role: ROLES.CANDIDATE,
  isActive: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const createRepository = (overrides: Partial<IUserRepository> = {}): IUserRepository => ({
  findManyByIds: vi.fn(async () => []),
  findById: vi.fn(async () => USER),
  findByEmail: vi.fn(async () => null),
  existsByEmail: vi.fn(async () => false),
  create: vi.fn(async () => USER),
  markLoggedIn: vi.fn(async () => undefined),
  ...overrides,
});

describe('UserService.getById', () => {
  it('returns the user', async () => {
    const repository = createRepository();

    await expect(new UserService(repository).getById('user-1')).resolves.toEqual(USER);
    expect(repository.findById).toHaveBeenCalledWith('user-1');
  });

  it('throws a 404 with a stable code when the user is gone', async () => {
    const repository = createRepository({ findById: vi.fn(async () => null) });

    await expect(new UserService(repository).getById('missing')).rejects.toMatchObject({
      statusCode: 404,
      code: ERROR_CODES.USER_NOT_FOUND,
    });
  });

  it('propagates repository failures', async () => {
    const repository = createRepository({
      findById: vi.fn(async () => {
        throw new Error('database is down');
      }),
    });

    await expect(new UserService(repository).getById('user-1')).rejects.toThrow(
      'database is down',
    );
  });
});

describe('UserService.assertEmailAvailable', () => {
  it('resolves when the email is free', async () => {
    const repository = createRepository();

    await expect(
      new UserService(repository).assertEmailAvailable('new@example.com'),
    ).resolves.toBeUndefined();
  });

  it('throws a 409 when the email is taken', async () => {
    const repository = createRepository({ existsByEmail: vi.fn(async () => true) });

    await expect(
      new UserService(repository).assertEmailAvailable('ada@example.com'),
    ).rejects.toMatchObject({ statusCode: 409, code: ERROR_CODES.EMAIL_ALREADY_EXISTS });
  });
});
