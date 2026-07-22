import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { requireAuth } from '../../common/middlewares/authorize.middleware';
import { validateRequest } from '../../common/middlewares/validate.middleware';
import type { IProfileService } from './profile.interface';

/**
 * `PUT /profile` accepts a different body per role, so the schema is chosen from the
 * authenticated role and then run through the shared validator — the 422 shape stays
 * identical to every other endpoint.
 */
export const createProfileUpdateValidator = (profileService: IProfileService): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { role } = requireAuth(req);
    validateRequest({ body: profileService.getUpdateSchema(role) })(req, res, next);
  };
};
