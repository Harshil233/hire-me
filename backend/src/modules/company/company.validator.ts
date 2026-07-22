import type { RequestHandler } from 'express';

import { validateRequest } from '../../common/middlewares/validate.middleware';
import {
  companyIdParamsSchema,
  createCompanySchema,
  updateCompanySchema,
} from './company.schema';

export const validateCreateCompany: RequestHandler = validateRequest({
  body: createCompanySchema,
});

export const validateUpdateCompany: RequestHandler = validateRequest({
  params: companyIdParamsSchema,
  body: updateCompanySchema,
});

export const validateCompanyIdParam: RequestHandler = validateRequest({
  params: companyIdParamsSchema,
});
