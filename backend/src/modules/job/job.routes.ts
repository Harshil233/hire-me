import { Router, type RequestHandler } from 'express';

import { ROLES } from '../../config/constants';
import { authorize } from '../../common/middlewares/authorize.middleware';
import type { JobController } from './job.controller';
import {
  validateCreateJob,
  validateHrJobQuery,
  validateJobIdParam,
  validateJobQuery,
  validateJobStatus,
  validateUpdateJob,
} from './job.validator';

export interface JobRoutesDependencies {
  readonly controller: JobController;
  readonly authenticate: RequestHandler;
}

/**
 * Route table: path → guards → validator → controller method.
 *
 * `/mine` is declared before `/:id` so the literal segment is not swallowed by the
 * parameter route. Writes are HR-only; ownership is enforced in the service, which
 * answers 404 for another company's listing.
 */
export const createJobRouter = ({
  controller,
  authenticate,
}: JobRoutesDependencies): Router => {
  const router = Router();
  const hrOnly = [authenticate, authorize(ROLES.HR)];

  router.get('/', authenticate, validateJobQuery, controller.browse);
  router.get('/mine', ...hrOnly, validateHrJobQuery, controller.listMine);
  router.post('/', ...hrOnly, validateCreateJob, controller.create);
  router.get('/:id', authenticate, validateJobIdParam, controller.getById);
  router.put('/:id', ...hrOnly, validateUpdateJob, controller.update);
  router.patch('/:id/status', ...hrOnly, validateJobStatus, controller.changeStatus);

  return router;
};
