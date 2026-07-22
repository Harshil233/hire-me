import type { NextFunction, Request, RequestHandler, Response } from 'express';

import type { Role } from '../../config/constants';
import { ERROR_CODES } from '../errors/error-codes';
import { ForbiddenError, UnauthorizedError } from '../errors/app-error';
import type { AuthContext } from '../types/express';

/** Guard: the authenticated user must hold one of `allowedRoles`. */
export const authorize = (...allowedRoles: readonly Role[]): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.auth === undefined) {
      next(new UnauthorizedError('Authentication is required', ERROR_CODES.UNAUTHENTICATED));
      return;
    }

    if (!allowedRoles.includes(req.auth.role)) {
      next(
        new ForbiddenError(
          'Your account type cannot access this resource',
          ERROR_CODES.ROLE_FORBIDDEN,
        ),
      );
      return;
    }

    next();
  };
};

/**
 * Narrows `req.auth` for controllers. Routes always sit behind `authenticate`, so a
 * missing context is a wiring bug rather than a client error.
 */
export const requireAuth = (req: Request): AuthContext => {
  if (req.auth === undefined) {
    throw new UnauthorizedError('Authentication is required', ERROR_CODES.UNAUTHENTICATED);
  }
  return req.auth;
};
