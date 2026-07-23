import { describe, expect, it, vi } from 'vitest';

import { CandidateAudienceAdapter } from '../../candidate/candidate-audience.adapter';
import type {
  CandidateProfile,
  ICandidateProfileRepository,
} from '../../candidate/candidate.interface';
import { UserEmailDirectoryAdapter } from '../../user/user-email-directory.adapter';
import type { IUserRepository, User } from '../../user/user.interface';

const NOW = new Date('2026-07-01T10:00:00.000Z');

const profile = (userId: string, isOpenToOutreach: boolean): CandidateProfile => ({
  id: `profile-${userId}`,
  userId,
  firstName: 'Ada',
  lastName: 'Lovelace',
  preferredLocations: [],
  skills: [],
  jobTypes: [],
  isOpenToOutreach,
  createdAt: NOW,
  updatedAt: NOW,
});

const user = (id: string, email: string, isActive = true): User => ({
  id,
  email,
  role: 'candidate',
  isActive,
  createdAt: NOW,
  updatedAt: NOW,
});

const candidateRepository = (profiles: CandidateProfile[]): ICandidateProfileRepository =>
  ({
    findByUserId: vi.fn(async () => profiles[0] ?? null),
    findManyByUserIds: vi.fn(async () => profiles),
    search: vi.fn(async () => ({ items: profiles, total: profiles.length })),
    create: vi.fn(),
    update: vi.fn(),
  }) as unknown as ICandidateProfileRepository;

describe('CandidateAudienceAdapter', () => {
  it('leaves out anyone who opted out of employer email', async () => {
    const adapter = new CandidateAudienceAdapter(
      candidateRepository([profile('a', true), profile('b', false)]),
    );

    expect(await adapter.findByUserIds(['a', 'b'])).toEqual([{ userId: 'a', firstName: 'Ada' }]);
  });

  it('applies the same rule to a filter audience', async () => {
    const adapter = new CandidateAudienceAdapter(
      candidateRepository([profile('a', false), profile('b', false)]),
    );

    expect(await adapter.findByFilter({}, 50)).toEqual([]);
  });

  it('returns the people a filter matched', async () => {
    const adapter = new CandidateAudienceAdapter(
      candidateRepository([profile('a', true), profile('b', true)]),
    );

    expect(await adapter.findByFilter({}, 50)).toHaveLength(2);
  });

  it('never returns more than the cap it was given', async () => {
    const many = Array.from({ length: 5 }, (_, i) => profile(`u${String(i)}`, true));
    const adapter = new CandidateAudienceAdapter(candidateRepository(many));

    expect(await adapter.findByFilter({}, 2)).toHaveLength(2);
  });

  it('stops rather than looping when the pool is empty', async () => {
    const adapter = new CandidateAudienceAdapter(candidateRepository([]));

    expect(await adapter.findByFilter({}, 50)).toEqual([]);
  });
});

describe('UserEmailDirectoryAdapter', () => {
  const userRepository = (users: User[]): IUserRepository =>
    ({
      findById: vi.fn(),
      findManyByIds: vi.fn(async () => users),
      findByEmail: vi.fn(),
      existsByEmail: vi.fn(),
      create: vi.fn(),
      markLoggedIn: vi.fn(),
    }) as unknown as IUserRepository;

  it('maps each account to its address', async () => {
    const adapter = new UserEmailDirectoryAdapter(
      userRepository([user('a', 'ada@example.com'), user('b', 'neel@example.com')]),
    );

    const found = await adapter.findEmails(['a', 'b']);

    expect(found.get('a')).toBe('ada@example.com');
    expect(found.get('b')).toBe('neel@example.com');
  });

  it('leaves out a deactivated account', async () => {
    const adapter = new UserEmailDirectoryAdapter(
      userRepository([user('a', 'ada@example.com', false)]),
    );

    expect((await adapter.findEmails(['a'])).size).toBe(0);
  });

  it('asks for each id once, however often it was given', async () => {
    const repository = userRepository([user('a', 'ada@example.com')]);
    const adapter = new UserEmailDirectoryAdapter(repository);

    await adapter.findEmails(['a', 'a', 'a']);

    expect(repository.findManyByIds).toHaveBeenCalledWith(['a']);
  });
});
