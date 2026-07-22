import { z } from 'zod';

import { ROLE_VALUES } from '../../config/constants';

export const accessTokenPayloadSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(ROLE_VALUES),
});
export type AccessTokenPayload = z.infer<typeof accessTokenPayloadSchema>;

export const refreshTokenPayloadSchema = z.object({
  sub: z.string().min(1),
  /** Unique id of this specific token — stored hashed for rotation checks. */
  jti: z.string().min(1),
  /** Token family; reuse of a rotated token revokes the whole family. */
  family: z.string().min(1),
  exp: z.number().int().positive(),
});
export type RefreshTokenPayload = z.infer<typeof refreshTokenPayloadSchema>;

export interface SignedRefreshToken {
  readonly token: string;
  readonly jti: string;
  readonly family: string;
  readonly expiresAt: Date;
}

/** Read side — all the `authenticate` middleware needs (ISP, CLAUDE.md §3). */
export interface IAccessTokenVerifier {
  verifyAccessToken(token: string): AccessTokenPayload;
}

/** Write side — used by the auth service only. */
export interface IAccessTokenIssuer {
  signAccessToken(payload: AccessTokenPayload): string;
}

export interface IRefreshTokenService {
  signRefreshToken(input: { userId: string; family?: string }): SignedRefreshToken;
  verifyRefreshToken(token: string): RefreshTokenPayload;
}

export interface ITokenService
  extends IAccessTokenVerifier,
    IAccessTokenIssuer,
    IRefreshTokenService {}
