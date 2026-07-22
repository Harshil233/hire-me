import { COMPANY_ROLES, ROLES, type Role } from '../../config/constants';
import { UnauthorizedError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import type { ITransactionManager } from '../../common/persistence/transaction.types';
import type { IPasswordHasher } from '../../common/security/password-hasher';
import type { ITokenService } from '../../common/security/token.types';
import { sha256 } from '../../common/utils/hash';
import type { ICandidateProfileService } from '../candidate/candidate.interface';
import type { ICompanyService } from '../company/company.interface';
import type { IHrProfileService } from '../hr/hr.interface';
import type { IUserRepository, IUserService, User } from '../user/user.interface';
import type {
  AuthSession,
  IAuthService,
  IRefreshTokenRepository,
  SessionMetadata,
} from './auth.interface';
import type { LoginInput, RegisterCandidateInput, RegisterHrInput } from './auth.schema';

/**
 * A valid bcrypt digest of a value nobody knows. Comparing against it when the email is
 * unknown keeps the response time of "no such user" close to "wrong password", so login
 * cannot be used to enumerate accounts.
 */
const DECOY_PASSWORD_HASH = '$2b$12$BTGIAJPdXwcipXwF5rCrMOYZu5vpIqpO3hl3R07NxfKSzON0OM8Iq';

export interface AuthServiceDependencies {
  readonly userRepository: IUserRepository;
  readonly userService: IUserService;
  readonly refreshTokenRepository: IRefreshTokenRepository;
  readonly candidateProfileService: ICandidateProfileService;
  readonly hrProfileService: IHrProfileService;
  readonly companyService: ICompanyService;
  readonly passwordHasher: IPasswordHasher;
  readonly tokenService: ITokenService;
  readonly transactionManager: ITransactionManager;
  readonly now: () => Date;
}

export class AuthService implements IAuthService {
  constructor(private readonly deps: AuthServiceDependencies) {}

  async registerCandidate(
    input: RegisterCandidateInput,
    meta: SessionMetadata,
  ): Promise<AuthSession> {
    await this.deps.userService.assertEmailAvailable(input.email);
    const passwordHash = await this.deps.passwordHasher.hash(input.password);

    const user = await this.deps.transactionManager.runInTransaction(async (context) => {
      const created = await this.deps.userRepository.create(
        { email: input.email, passwordHash, role: ROLES.CANDIDATE },
        context,
      );

      await this.deps.candidateProfileService.createForUser(
        created.id,
        {
          firstName: input.firstName,
          lastName: input.lastName,
          ...(input.middleName !== undefined ? { middleName: input.middleName } : {}),
        },
        context,
      );

      return created;
    });

    return this.issueSession(user, meta);
  }

  async registerHr(input: RegisterHrInput, meta: SessionMetadata): Promise<AuthSession> {
    await this.deps.userService.assertEmailAvailable(input.email);
    const passwordHash = await this.deps.passwordHasher.hash(input.password);

    const user = await this.deps.transactionManager.runInTransaction(async (context) => {
      const created = await this.deps.userRepository.create(
        { email: input.email, passwordHash, role: ROLES.HR },
        context,
      );

      const company = await this.deps.companyService.create(input.company, created.id, context);

      await this.deps.hrProfileService.createForUser(
        created.id,
        {
          firstName: input.firstName,
          lastName: input.lastName,
          ...(input.middleName !== undefined ? { middleName: input.middleName } : {}),
          ...(input.designation !== undefined ? { designation: input.designation } : {}),
          companyId: company.id,
          companyRole: COMPANY_ROLES.OWNER,
        },
        context,
      );

      return created;
    });

    return this.issueSession(user, meta);
  }

  async login(input: LoginInput, meta: SessionMetadata, expectedRole: Role): Promise<AuthSession> {
    const user = await this.deps.userRepository.findByEmail(input.email);

    if (user === null) {
      await this.deps.passwordHasher.compare(input.password, DECOY_PASSWORD_HASH);
      throw AuthService.invalidCredentials();
    }

    const matches = await this.deps.passwordHasher.compare(input.password, user.passwordHash);

    if (!matches) {
      throw AuthService.invalidCredentials();
    }

    // Each role signs in through its own path. A mismatch answers with the same generic
    // error as a wrong password, so the route cannot be used to discover an account's
    // role — and is checked before `markLoggedIn`, so a wrong-path attempt leaves no trace.
    if (user.role !== expectedRole) {
      throw AuthService.invalidCredentials();
    }

    if (!user.isActive) {
      throw new UnauthorizedError(
        'This account has been disabled',
        ERROR_CODES.ACCOUNT_DISABLED,
      );
    }

    await this.deps.userRepository.markLoggedIn(user.id, this.deps.now());

    return this.issueSession(user, meta);
  }

  async refresh(rawRefreshToken: string, meta: SessionMetadata): Promise<AuthSession> {
    const payload = this.deps.tokenService.verifyRefreshToken(rawRefreshToken);
    const stored = await this.deps.refreshTokenRepository.findByTokenHash(sha256(rawRefreshToken));
    const now = this.deps.now();

    // Unknown or already-rotated token: assume theft and drop the whole family.
    if (stored === null || stored.revokedAt !== undefined) {
      await this.deps.refreshTokenRepository.revokeFamily(payload.family, now);
      throw AuthService.invalidRefreshToken();
    }

    if (stored.expiresAt.getTime() <= now.getTime()) {
      await this.deps.refreshTokenRepository.revokeById(stored.id, now);
      throw AuthService.invalidRefreshToken();
    }

    const user = await this.deps.userRepository.findById(stored.userId);

    if (user === null || !user.isActive) {
      await this.deps.refreshTokenRepository.revokeFamily(stored.family, now);
      throw AuthService.invalidRefreshToken();
    }

    await this.deps.refreshTokenRepository.revokeById(stored.id, now);

    return this.issueSession(user, meta, stored.family);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    let family: string | null = null;

    try {
      family = this.deps.tokenService.verifyRefreshToken(rawRefreshToken).family;
    } catch {
      // An unreadable cookie still means "log me out" — nothing to revoke.
      return;
    }

    await this.deps.refreshTokenRepository.revokeFamily(family, this.deps.now());
  }

  /** Mints an access token and a rotated refresh token, persisting only the digest. */
  private async issueSession(
    user: User,
    meta: SessionMetadata,
    family?: string,
  ): Promise<AuthSession> {
    const accessToken = this.deps.tokenService.signAccessToken({
      sub: user.id,
      role: user.role,
    });

    const refresh = this.deps.tokenService.signRefreshToken({
      userId: user.id,
      ...(family !== undefined ? { family } : {}),
    });

    await this.deps.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: sha256(refresh.token),
      jti: refresh.jti,
      family: refresh.family,
      expiresAt: refresh.expiresAt,
      userAgent: meta.userAgent,
    });

    return {
      user,
      accessToken,
      refreshToken: refresh.token,
      refreshExpiresAt: refresh.expiresAt,
    };
  }

  private static invalidCredentials(): UnauthorizedError {
    return new UnauthorizedError(
      'Email or password is incorrect',
      ERROR_CODES.INVALID_CREDENTIALS,
    );
  }

  private static invalidRefreshToken(): UnauthorizedError {
    return new UnauthorizedError(
      'Your session has expired, please sign in again',
      ERROR_CODES.REFRESH_TOKEN_INVALID,
    );
  }
}
