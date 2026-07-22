import { randomUUID } from 'node:crypto';

import jwt, { type SignOptions } from 'jsonwebtoken';

import { ERROR_CODES } from '../errors/error-codes';
import { UnauthorizedError } from '../errors/app-error';
import {
  accessTokenPayloadSchema,
  refreshTokenPayloadSchema,
  type AccessTokenPayload,
  type ITokenService,
  type RefreshTokenPayload,
  type SignedRefreshToken,
} from './token.types';

/**
 * `jsonwebtoken` types `expiresIn` as a template-literal union (`"15m"`, `"7d"`, …)
 * that a plain `string` cannot satisfy. The env schema constrains the format, so the
 * narrowing cast is safe.
 */
type JwtExpiresIn = NonNullable<SignOptions['expiresIn']>;

export interface JwtTokenServiceOptions {
  readonly accessSecret: string;
  readonly accessTtl: string;
  readonly refreshSecret: string;
  readonly refreshTtl: string;
}

/** Adapter around `jsonwebtoken`; nothing else in the codebase imports the library. */
export class JwtTokenService implements ITokenService {
  constructor(
    private readonly options: JwtTokenServiceOptions,
    private readonly generateId: () => string = randomUUID,
  ) {}

  signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign({ role: payload.role }, this.options.accessSecret, {
      subject: payload.sub,
      expiresIn: this.options.accessTtl as JwtExpiresIn,
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const decoded = this.verify(token, this.options.accessSecret);
    const result = accessTokenPayloadSchema.safeParse(decoded);

    if (!result.success) {
      throw new UnauthorizedError('Access token payload is malformed', ERROR_CODES.TOKEN_INVALID);
    }

    return result.data;
  }

  signRefreshToken(input: { userId: string; family?: string }): SignedRefreshToken {
    const jti = this.generateId();
    const family = input.family ?? this.generateId();

    const token = jwt.sign({ jti, family }, this.options.refreshSecret, {
      subject: input.userId,
      expiresIn: this.options.refreshTtl as JwtExpiresIn,
    });

    const payload = this.verifyRefreshToken(token);

    return { token, jti, family, expiresAt: new Date(payload.exp * 1000) };
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const decoded = this.verify(token, this.options.refreshSecret);
    const result = refreshTokenPayloadSchema.safeParse(decoded);

    if (!result.success) {
      throw new UnauthorizedError(
        'Refresh token payload is malformed',
        ERROR_CODES.REFRESH_TOKEN_INVALID,
      );
    }

    return result.data;
  }

  private verify(token: string, secret: string): unknown {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Token has expired', ERROR_CODES.TOKEN_EXPIRED);
      }
      throw new UnauthorizedError('Token is invalid', ERROR_CODES.TOKEN_INVALID);
    }
  }
}
