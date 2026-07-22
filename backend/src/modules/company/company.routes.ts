import { Router, type RequestHandler } from 'express';

import { ROLES } from '../../config/constants';
import { authorize } from '../../common/middlewares/authorize.middleware';
import type { CompanyController } from './company.controller';
import {
  validateCompanyIdParam,
  validateCreateCompany,
  validateUpdateCompany,
} from './company.validator';

export interface CompanyRoutesDependencies {
  readonly controller: CompanyController;
  readonly authenticate: RequestHandler;
}

/** Route table: path → guards → validator → controller method. */
export const createCompanyRouter = ({
  controller,
  authenticate,
}: CompanyRoutesDependencies): Router => {
  const router = Router();

  router.post(
    '/register',
    authenticate,
    authorize(ROLES.HR),
    validateCreateCompany,
    controller.register,
  );
  router.get('/:id', authenticate, validateCompanyIdParam, controller.getById);
  router.put('/:id', authenticate, authorize(ROLES.HR), validateUpdateCompany, controller.update);

  return router;
};
