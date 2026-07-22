import { Router, type RequestHandler } from 'express';

import type { ProfileController } from './profile.controller';

export interface ProfileRoutesDependencies {
  readonly controller: ProfileController;
  readonly authenticate: RequestHandler;
  readonly validateUpdate: RequestHandler;
}

export const createProfileRouter = ({
  controller,
  authenticate,
  validateUpdate,
}: ProfileRoutesDependencies): Router => {
  const router = Router();

  router.get('/', authenticate, controller.get);
  router.put('/', authenticate, validateUpdate, controller.update);

  return router;
};
