import { Router, type RequestHandler } from 'express';

import { ROLES } from '../../config/constants';
import type { AuthController } from './auth.controller';
import { validateLogin, validateRegisterCandidate, validateRegisterHr } from './auth.validator';

export interface AuthRoutesDependencies {
  readonly controller: AuthController;
  readonly authenticate: RequestHandler;
  /** Tighter limiter for credential endpoints. */
  readonly authRateLimiter: RequestHandler;
}

/**
 * Auth routes are mounted at the API root, matching the agreed contract:
 * `/candidate/register`, `/hr/register`, `/candidate/login`, `/hr/login`, `/refresh`,
 * `/logout`, `/me`.
 *
 * Registration and sign-in are both scoped by role: an account can only authenticate
 * through the path belonging to its own role.
 */
export const createAuthRouter = ({
  controller,
  authenticate,
  authRateLimiter,
}: AuthRoutesDependencies): Router => {
  const router = Router();

  router.post(
    '/candidate/register',
    authRateLimiter,
    validateRegisterCandidate,
    controller.registerCandidate,
  );
  router.post('/hr/register', authRateLimiter, validateRegisterHr, controller.registerHr);

  router.post(
    '/candidate/login',
    authRateLimiter,
    validateLogin,
    controller.loginAs(ROLES.CANDIDATE),
  );
  router.post('/hr/login', authRateLimiter, validateLogin, controller.loginAs(ROLES.HR));

  router.post('/refresh', authRateLimiter, controller.refresh);
  router.post('/logout', controller.logout);
  router.get('/me', authenticate, controller.me);

  return router;
};
