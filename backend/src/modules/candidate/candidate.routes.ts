import { Router, type RequestHandler } from 'express';

import { ROLES } from '../../config/constants';
import { authorize } from '../../common/middlewares/authorize.middleware';
import type { CandidateController } from './candidate.controller';
import { validateCandidateQuery, validateCandidateUserIdParam } from './candidate.validator';

export interface CandidateRoutesDependencies {
  readonly controller: CandidateController;
  readonly authenticate: RequestHandler;
}

/**
 * The talent pool an employer browses. HR-only: a candidate has no business enumerating
 * other candidates, and the payload is narrowed to a browse card regardless.
 */
export const createCandidateRouter = ({
  controller,
  authenticate,
}: CandidateRoutesDependencies): Router => {
  const router = Router();

  router.get('/', authenticate, authorize(ROLES.HR), validateCandidateQuery, controller.browse);
  router.get(
    '/:userId',
    authenticate,
    authorize(ROLES.HR),
    validateCandidateUserIdParam,
    controller.detail,
  );

  return router;
};
