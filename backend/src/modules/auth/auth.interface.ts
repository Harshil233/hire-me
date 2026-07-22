import type { Role } from '../../config/constants';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import { createToken, type Token } from '../../container/token';
import type { User } from '../user/user.interface';
import type { LoginInput, RegisterCandidateInput, RegisterHrInput } from './auth.schema';

/** A persisted refresh token. The raw value exists only in the client cookie. */
export interface StoredRefreshToken {
  readonly id: string;
  readonly userId: string;
  readonly jti: string;
  readonly family: string;
  readonly expiresAt: Date;
  readonly revokedAt?: Date | undefined;
}

export interface CreateRefreshTokenData {
  readonly userId: string;
  readonly tokenHash: string;
  readonly jti: string;
  readonly family: string;
  readonly expiresAt: Date;
  readonly userAgent?: string | undefined;
}

export interface IRefreshTokenRepository {
  create(data: CreateRefreshTokenData, context?: TransactionContext): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<StoredRefreshToken | null>;
  revokeById(id: string, revokedAt: Date): Promise<void>;
  /** Revokes every token in a rotation family — used when a rotated token is replayed. */
  revokeFamily(family: string, revokedAt: Date): Promise<void>;
}

/** Request-scoped metadata recorded against an issued token. */
export interface SessionMetadata {
  readonly userAgent?: string | undefined;
}

export interface AuthSession {
  readonly user: User;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly refreshExpiresAt: Date;
}

export interface IAuthService {
  registerCandidate(input: RegisterCandidateInput, meta: SessionMetadata): Promise<AuthSession>;
  registerHr(input: RegisterHrInput, meta: SessionMetadata): Promise<AuthSession>;
  /**
   * `expectedRole` is the role that owns the path the request arrived on. An account
   * whose role differs is refused, so each role signs in only through its own route.
   */
  login(input: LoginInput, meta: SessionMetadata, expectedRole: Role): Promise<AuthSession>;
  refresh(rawRefreshToken: string, meta: SessionMetadata): Promise<AuthSession>;
  logout(rawRefreshToken: string): Promise<void>;
}

export const REFRESH_TOKEN_REPOSITORY: Token<IRefreshTokenRepository> = createToken(
  'IRefreshTokenRepository',
);
export const AUTH_SERVICE: Token<IAuthService> = createToken('IAuthService');
