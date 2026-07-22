import type { RequestHandler } from 'express';

import { validateRequest } from '../../common/middlewares/validate.middleware';
import { jobIdParamsSchema } from '../job/job.schema';
import {
  applicationIdParamsSchema,
  applicationStatusSchema,
  applySchema,
  jobApplicantQuerySchema,
  myApplicationQuerySchema,
} from './application.schema';

export const validateApply: RequestHandler = validateRequest({
  params: jobIdParamsSchema,
  body: applySchema,
});

export const validateJobApplicantQuery: RequestHandler = validateRequest({
  params: jobIdParamsSchema,
  query: jobApplicantQuerySchema,
});

export const validateMyApplicationQuery: RequestHandler = validateRequest({
  query: myApplicationQuerySchema,
});

export const validateApplicationStatus: RequestHandler = validateRequest({
  params: applicationIdParamsSchema,
  body: applicationStatusSchema,
});
