import { beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPANY_ROLES, ROLES } from '../../../config/constants';
import { ERROR_CODES } from '../../../common/errors/error-codes';
import { ConflictError } from '../../../common/errors/app-error';
import type {
  ITransactionManager,
  TransactionContext,
} from '../../../common/persistence/transaction.types';
import type { IPasswordHasher } from '../../../common/security/password-hasher';
import type { ITokenService } from '../../../common/security/token.types';
import { sha256 } from '../../../common/utils/hash';
import type { ICandidateProfileService } from '../../candidate/candidate.interface';
import type { ICompanyService } from '../../company/company.interface';
import type { IHrProfileService } from '../../hr/hr.interface';
import type { IUserRepository, IUserService, UserWithSecret } from '../../user/user.interface';
import { AuthService, type AuthServiceDependencies } from '../auth.service';
import type { IRefreshTokenRepository, StoredRefreshToken } from '../auth.interface';

const NOW = new Date('2026-01-15T10:00:00.000Z');
const LATER = new Date('2026-01-22T10:00:00.000Z');
const TEST_CONTEXT: TransactionContext = { transactionId: 'txn-1' };

const USER: UserWithSecret = {
  id: 'user-1',
  email: 'ada@example.com',
  role: ROLES.CANDIDATE,
  isActive: true,
  passwordHash: 'stored-hash',
  createdAt: NOW,
  updatedAt: NOW,
};

const STORED_TOKEN: StoredRefreshToken = {
  id: 'token-1',
  userId: 'user-1',
  jti: 'jti-1',
  family: 'family-1',
  expiresAt: LATER,
};

const REGISTER_CANDIDATE = {
  email: 'ada@example.com',
  password: 'Str0ng!pass',
  firstName: 'Ada',
  lastName: 'Lovelace',
};

const REGISTER_HR = {
  ...REGISTER_CANDIDATE,
  company: { name: 'Acme', locations: [] },
};

interface Harness {
  readonly service: AuthService;
  readonly deps: {
    [K in keyof AuthServiceDependencies]: AuthServiceDependencies[K];
  };
}

const createHarness = (overrides: Partial<AuthServiceDependencies> = {}): Harness => {
  const userRepository: IUserRepository = {
    findById: vi.fn(async () => USER),
    findByEmail: vi.fn(async () => USER),
    existsByEmail: vi.fn(async () => false),
    create: vi.fn(async () => USER),
    markLoggedIn: vi.fn(async () => undefined),
  };

  const userService: IUserService = {
    getById: vi.fn(async () => USER),
    assertEmailAvailable: vi.fn(async () => undefined),
  };

  const refreshTokenRepository: IRefreshTokenRepository = {
    create: vi.fn(async () => undefined),
    findByTokenHash: vi.fn(async () => STORED_TOKEN),
    revokeById: vi.fn(async () => undefined),
    revokeFamily: vi.fn(async () => undefined),
  };

  const candidateProfileService = {
    createForUser: vi.fn(async () => ({}) as never),
    getByUserId: vi.fn(),
    update: vi.fn(),
  } as unknown as ICandidateProfileService;

  const hrProfileService = {
    createForUser: vi.fn(async () => ({}) as never),
    getByUserId: vi.fn(),
    update: vi.fn(),
  } as unknown as IHrProfileService;

  const companyService = {
    create: vi.fn(async () => ({ id: 'company-1', name: 'Acme' }) as never),
    registerForUser: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
  } as unknown as ICompanyService;

  const passwordHasher: IPasswordHasher = {
    hash: vi.fn(async () => 'stored-hash'),
    compare: vi.fn(async () => true),
  };

  const tokenService: ITokenService = {
    signAccessToken: vi.fn(() => 'access-token'),
    verifyAccessToken: vi.fn(() => ({ sub: 'user-1', role: ROLES.CANDIDATE })),
    signRefreshToken: vi.fn(() => ({
      token: 'refresh-token',
      jti: 'jti-2',
      family: 'family-1',
      expiresAt: LATER,
    })),
    verifyRefreshToken: vi.fn(() => ({
      sub: 'user-1',
      jti: 'jti-1',
      family: 'family-1',
      exp: Math.floor(LATER.getTime() / 1000),
    })),
  };

  const transactionManager: ITransactionManager = {
    runInTransaction: vi.fn(async (work) => work(TEST_CONTEXT)),
  };

  const deps: AuthServiceDependencies = {
    userRepository,
    userService,
    refreshTokenRepository,
    candidateProfileService,
    hrProfileService,
    companyService,
    passwordHasher,
    tokenService,
    transactionManager,
    now: () => NOW,
    ...overrides,
  };

  return { service: new AuthService(deps), deps };
};

describe('AuthService.registerCandidate', () => {
  let harness: Harness;

  beforeEach(() => {
    harness = createHarness();
  });

  it('creates the account and its profile inside one transaction', async () => {
    await harness.service.registerCandidate(REGISTER_CANDIDATE, {});

    expect(harness.deps.userService.assertEmailAvailable).toHaveBeenCalledWith(
      'ada@example.com',
    );
    expect(harness.deps.transactionManager.runInTransaction).toHaveBeenCalledOnce();
    expect(harness.deps.userRepository.create).toHaveBeenCalledWith(
      { email: 'ada@example.com', passwordHash: 'stored-hash', role: ROLES.CANDIDATE },
      TEST_CONTEXT,
    );
    expect(harness.deps.candidateProfileService.createForUser).toHaveBeenCalledWith(
      'user-1',
      { firstName: 'Ada', lastName: 'Lovelace' },
      TEST_CONTEXT,
    );
  });

  it('never stores the plain password', async () => {
    await harness.service.registerCandidate(REGISTER_CANDIDATE, {});

    expect(harness.deps.passwordHasher.hash).toHaveBeenCalledWith('Str0ng!pass');
    const [created] = vi.mocked(harness.deps.userRepository.create).mock.calls[0] ?? [];
    expect(JSON.stringify(created)).not.toContain('Str0ng!pass');
  });

  it('passes an optional middle name through', async () => {
    await harness.service.registerCandidate({ ...REGISTER_CANDIDATE, middleName: 'B' }, {});

    expect(harness.deps.candidateProfileService.createForUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ middleName: 'B' }),
      TEST_CONTEXT,
    );
  });

  it('returns a session with both tokens', async () => {
    const session = await harness.service.registerCandidate(REGISTER_CANDIDATE, {});

    expect(session).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      refreshExpiresAt: LATER,
    });
    expect(session.user.id).toBe('user-1');
  });

  it('stores only the digest of the refresh token', async () => {
    await harness.service.registerCandidate(REGISTER_CANDIDATE, { userAgent: 'vitest' });

    expect(harness.deps.refreshTokenRepository.create).toHaveBeenCalledWith({
      userId: 'user-1',
      tokenHash: sha256('refresh-token'),
      jti: 'jti-2',
      family: 'family-1',
      expiresAt: LATER,
      userAgent: 'vitest',
    });
  });

  it('stops before hashing when the email is taken', async () => {
    const taken = createHarness();
    vi.mocked(taken.deps.userService.assertEmailAvailable).mockRejectedValue(
      new ConflictError('taken', ERROR_CODES.EMAIL_ALREADY_EXISTS),
    );

    await expect(taken.service.registerCandidate(REGISTER_CANDIDATE, {})).rejects.toMatchObject({
      code: ERROR_CODES.EMAIL_ALREADY_EXISTS,
    });
    expect(taken.deps.passwordHasher.hash).not.toHaveBeenCalled();
    expect(taken.deps.transactionManager.runInTransaction).not.toHaveBeenCalled();
  });

  it('does not issue a session when the transaction fails', async () => {
    const failing = createHarness();
    vi.mocked(failing.deps.transactionManager.runInTransaction).mockRejectedValue(
      new Error('write conflict'),
    );

    await expect(failing.service.registerCandidate(REGISTER_CANDIDATE, {})).rejects.toThrow(
      'write conflict',
    );
    expect(failing.deps.refreshTokenRepository.create).not.toHaveBeenCalled();
  });
});

describe('AuthService.registerHr', () => {
  it('creates user, company and HR profile in one transaction', async () => {
    const harness = createHarness();

    await harness.service.registerHr(REGISTER_HR, {});

    expect(harness.deps.userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: ROLES.HR }),
      TEST_CONTEXT,
    );
    expect(harness.deps.companyService.create).toHaveBeenCalledWith(
      REGISTER_HR.company,
      'user-1',
      TEST_CONTEXT,
    );
    expect(harness.deps.hrProfileService.createForUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ companyId: 'company-1', companyRole: COMPANY_ROLES.OWNER }),
      TEST_CONTEXT,
    );
  });

  it('records the optional designation', async () => {
    const harness = createHarness();

    await harness.service.registerHr({ ...REGISTER_HR, designation: 'Talent Lead' }, {});

    expect(harness.deps.hrProfileService.createForUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ designation: 'Talent Lead' }),
      TEST_CONTEXT,
    );
  });

  it('aborts without a session when the company cannot be created', async () => {
    const harness = createHarness();
    vi.mocked(harness.deps.companyService.create).mockRejectedValue(
      new ConflictError('domain taken', ERROR_CODES.COMPANY_ALREADY_EXISTS),
    );

    await expect(harness.service.registerHr(REGISTER_HR, {})).rejects.toMatchObject({
      code: ERROR_CODES.COMPANY_ALREADY_EXISTS,
    });
    expect(harness.deps.refreshTokenRepository.create).not.toHaveBeenCalled();
  });
});

describe('AuthService.login', () => {
  const CREDENTIALS = { email: 'ada@example.com', password: 'Str0ng!pass' };

  it('issues a session for valid credentials and records the sign-in', async () => {
    const harness = createHarness();

    const session = await harness.service.login(CREDENTIALS, {}, ROLES.CANDIDATE);

    expect(session.accessToken).toBe('access-token');
    expect(harness.deps.userRepository.markLoggedIn).toHaveBeenCalledWith('user-1', NOW);
  });

  it('rejects an unknown email with the same generic error as a wrong password', async () => {
    const harness = createHarness();
    vi.mocked(harness.deps.userRepository.findByEmail).mockResolvedValue(null);

    await expect(
      harness.service.login({ email: 'nobody@example.com', password: 'x' }, {}, ROLES.CANDIDATE),
    ).rejects.toMatchObject({
      statusCode: 401,
      code: ERROR_CODES.INVALID_CREDENTIALS,
      message: 'Email or password is incorrect',
    });
  });

  it('still runs a password comparison for an unknown email, to level timing', async () => {
    const harness = createHarness();
    vi.mocked(harness.deps.userRepository.findByEmail).mockResolvedValue(null);

    await expect(
      harness.service.login({ email: 'nobody@e.com', password: 'x' }, {}, ROLES.CANDIDATE),
    ).rejects.toThrow();

    expect(harness.deps.passwordHasher.compare).toHaveBeenCalledOnce();
  });

  it('rejects a wrong password', async () => {
    const harness = createHarness();
    vi.mocked(harness.deps.passwordHasher.compare).mockResolvedValue(false);

    await expect(
      harness.service.login({ email: 'ada@example.com', password: 'wrong' }, {}, ROLES.CANDIDATE),
    ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_CREDENTIALS });
    expect(harness.deps.refreshTokenRepository.create).not.toHaveBeenCalled();
  });

  it('rejects a disabled account distinctly', async () => {
    const harness = createHarness();
    vi.mocked(harness.deps.userRepository.findByEmail).mockResolvedValue({
      ...USER,
      isActive: false,
    });

    await expect(
      harness.service.login(CREDENTIALS, {}, ROLES.CANDIDATE),
    ).rejects.toMatchObject({ code: ERROR_CODES.ACCOUNT_DISABLED });
  });

  it('refuses a candidate signing in through the HR path', async () => {
    const harness = createHarness();

    await expect(harness.service.login(CREDENTIALS, {}, ROLES.HR)).rejects.toMatchObject({
      statusCode: 401,
      code: ERROR_CODES.INVALID_CREDENTIALS,
    });
    expect(harness.deps.refreshTokenRepository.create).not.toHaveBeenCalled();
  });

  it('refuses an HR signing in through the candidate path', async () => {
    const harness = createHarness();
    vi.mocked(harness.deps.userRepository.findByEmail).mockResolvedValue({
      ...USER,
      role: ROLES.HR,
    });

    await expect(harness.service.login(CREDENTIALS, {}, ROLES.CANDIDATE)).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_CREDENTIALS,
    });
  });

  it('lets an HR sign in through the HR path', async () => {
    const harness = createHarness();
    vi.mocked(harness.deps.userRepository.findByEmail).mockResolvedValue({
      ...USER,
      role: ROLES.HR,
    });

    const session = await harness.service.login(CREDENTIALS, {}, ROLES.HR);

    expect(session.user.role).toBe(ROLES.HR);
  });

  it('gives the wrong path the exact same error as a wrong password, leaking no role', async () => {
    const harness = createHarness();
    const wrongPath = await harness.service.login(CREDENTIALS, {}, ROLES.HR).catch((e: unknown) => e);

    const wrongPassword = createHarness();
    vi.mocked(wrongPassword.deps.passwordHasher.compare).mockResolvedValue(false);
    const badPassword = await wrongPassword.service
      .login(CREDENTIALS, {}, ROLES.CANDIDATE)
      .catch((e: unknown) => e);

    expect(wrongPath).toMatchObject({
      statusCode: 401,
      code: ERROR_CODES.INVALID_CREDENTIALS,
      message: 'Email or password is incorrect',
    });
    expect(wrongPath).toEqual(badPassword);
  });

  it('does not record a sign-in when the role does not match the path', async () => {
    const harness = createHarness();

    await expect(harness.service.login(CREDENTIALS, {}, ROLES.HR)).rejects.toThrow();

    expect(harness.deps.userRepository.markLoggedIn).not.toHaveBeenCalled();
  });
});

describe('AuthService.refresh', () => {
  it('rotates the token inside the same family', async () => {
    const harness = createHarness();

    const session = await harness.service.refresh('refresh-token', {});

    expect(harness.deps.refreshTokenRepository.revokeById).toHaveBeenCalledWith('token-1', NOW);
    expect(harness.deps.tokenService.signRefreshToken).toHaveBeenCalledWith({
      userId: 'user-1',
      family: 'family-1',
    });
    expect(session.accessToken).toBe('access-token');
  });

  it('looks the token up by digest, never by raw value', async () => {
    const harness = createHarness();

    await harness.service.refresh('refresh-token', {});

    expect(harness.deps.refreshTokenRepository.findByTokenHash).toHaveBeenCalledWith(
      sha256('refresh-token'),
    );
  });

  it('revokes the whole family when an unknown token is presented', async () => {
    const harness = createHarness();
    vi.mocked(harness.deps.refreshTokenRepository.findByTokenHash).mockResolvedValue(null);

    await expect(harness.service.refresh('refresh-token', {})).rejects.toMatchObject({
      code: ERROR_CODES.REFRESH_TOKEN_INVALID,
    });
    expect(harness.deps.refreshTokenRepository.revokeFamily).toHaveBeenCalledWith(
      'family-1',
      NOW,
    );
  });

  it('treats replay of an already-rotated token as theft', async () => {
    const harness = createHarness();
    vi.mocked(harness.deps.refreshTokenRepository.findByTokenHash).mockResolvedValue({
      ...STORED_TOKEN,
      revokedAt: NOW,
    });

    await expect(harness.service.refresh('refresh-token', {})).rejects.toThrow();
    expect(harness.deps.refreshTokenRepository.revokeFamily).toHaveBeenCalledWith(
      'family-1',
      NOW,
    );
  });

  it('rejects an expired stored token', async () => {
    const harness = createHarness();
    vi.mocked(harness.deps.refreshTokenRepository.findByTokenHash).mockResolvedValue({
      ...STORED_TOKEN,
      expiresAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(harness.service.refresh('refresh-token', {})).rejects.toMatchObject({
      code: ERROR_CODES.REFRESH_TOKEN_INVALID,
    });
    expect(harness.deps.refreshTokenRepository.revokeById).toHaveBeenCalledWith('token-1', NOW);
  });

  it('rejects a token whose signature does not verify', async () => {
    const harness = createHarness();
    vi.mocked(harness.deps.tokenService.verifyRefreshToken).mockImplementation(() => {
      throw new Error('bad signature');
    });

    await expect(harness.service.refresh('forged', {})).rejects.toThrow('bad signature');
  });

  it('rejects when the account no longer exists', async () => {
    const harness = createHarness();
    vi.mocked(harness.deps.userRepository.findById).mockResolvedValue(null);

    await expect(harness.service.refresh('refresh-token', {})).rejects.toThrow();
    expect(harness.deps.refreshTokenRepository.revokeFamily).toHaveBeenCalled();
  });

  it('rejects when the account has been disabled since sign-in', async () => {
    const harness = createHarness();
    vi.mocked(harness.deps.userRepository.findById).mockResolvedValue({
      ...USER,
      isActive: false,
    });

    await expect(harness.service.refresh('refresh-token', {})).rejects.toThrow();
  });
});

describe('AuthService.logout', () => {
  it('revokes the presented token family', async () => {
    const harness = createHarness();

    await harness.service.logout('refresh-token');

    expect(harness.deps.refreshTokenRepository.revokeFamily).toHaveBeenCalledWith(
      'family-1',
      NOW,
    );
  });

  it('succeeds quietly when the cookie cannot be read', async () => {
    const harness = createHarness();
    vi.mocked(harness.deps.tokenService.verifyRefreshToken).mockImplementation(() => {
      throw new Error('unreadable');
    });

    await expect(harness.service.logout('garbage')).resolves.toBeUndefined();
    expect(harness.deps.refreshTokenRepository.revokeFamily).not.toHaveBeenCalled();
  });
});
