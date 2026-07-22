import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { AUTH_HEADER, BEARER_PREFIX } from '../../config/constants';
import { ERROR_CODES } from '../errors/error-codes';
import { UnauthorizedError } from '../errors/app-error';
import type { IAccessTokenVerifier } from '../security/token.types';

/**
 * Verifies the bearer access token and attaches `req.auth`.
 * Depends on the narrow verifier port, not the full token service (ISP).
 */
export const createAuthenticateMiddleware = (
  tokenVerifier: IAccessTokenVerifier,
): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.get(AUTH_HEADER);

    if (header === undefined || !header.startsWith(BEARER_PREFIX)) {
      next(
        new UnauthorizedError(
          'A bearer access token is required',
          ERROR_CODES.UNAUTHENTICATED,
        ),
      );
      return;
    }

    const token = header.slice(BEARER_PREFIX.length).trim();

    if (token.length === 0) {
      next(new UnauthorizedError('A bearer access token is required', ERROR_CODES.UNAUTHENTICATED));
      return;
    }

    try {
      const payload = tokenVerifier.verifyAccessToken(token);
      req.auth = { userId: payload.sub, role: payload.role };
      next();
    } catch (error) {
      next(error);
    }
  };
};
