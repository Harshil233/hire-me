import { Router, type RequestHandler } from 'express';

import { ROLES } from '../../config/constants';
import { authorize } from '../../common/middlewares/authorize.middleware';
import type { ApplicationController } from './application.controller';
import {
  validateApplicationStatus,
  validateApply,
  validateJobApplicantQuery,
  validateMyApplicationQuery,
} from './application.validator';

export interface ApplicationRoutesDependencies {
  readonly controller: ApplicationController;
  readonly authenticate: RequestHandler;
}

/**
 * Job-scoped application routes, mounted alongside the job router at `/jobs`. Applying
 * is candidate-only; reading a job's applicants is restricted in the service to the
 * company that owns the listing, which answers 404 for anyone else.
 */
export const createJobApplicationRouter = ({
  controller,
  authenticate,
}: ApplicationRoutesDependencies): Router => {
  const router = Router();

  router.post(
    '/:id/apply',
    authenticate,
    authorize(ROLES.CANDIDATE),
    validateApply,
    controller.apply,
  );
  router.get(
    '/:id/applications',
    authenticate,
    authorize(ROLES.HR),
    validateJobApplicantQuery,
    controller.listForJob,
  );

  return router;
};

/**
 * Applicant-scoped routes at `/applications`.
 *
 * `PATCH /:id/status` is open to both roles on purpose: the service decides which target
 * states each role may set, so an employer shortlists or rejects while a candidate only
 * withdraws. Splitting it by role here would put that rule in two places.
 */
export const createApplicationRouter = ({
  controller,
  authenticate,
}: ApplicationRoutesDependencies): Router => {
  const router = Router();

  router.get(
    '/',
    authenticate,
    authorize(ROLES.CANDIDATE),
    validateMyApplicationQuery,
    controller.listMine,
  );
  router.get('/job-ids', authenticate, authorize(ROLES.CANDIDATE), controller.listMineJobIds);
  router.patch('/:id/status', authenticate, validateApplicationStatus, controller.changeStatus);

  return router;
};
