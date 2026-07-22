import type { RequestHandler } from 'express';

import { validateRequest } from '../../common/middlewares/validate.middleware';
import {
  createJobSchema,
  hrJobQuerySchema,
  jobIdParamsSchema,
  jobQuerySchema,
  jobStatusSchema,
  updateJobSchema,
} from './job.schema';

export const validateCreateJob: RequestHandler = validateRequest({ body: createJobSchema });

export const validateUpdateJob: RequestHandler = validateRequest({
  params: jobIdParamsSchema,
  body: updateJobSchema,
});

export const validateJobStatus: RequestHandler = validateRequest({
  params: jobIdParamsSchema,
  body: jobStatusSchema,
});

export const validateJobIdParam: RequestHandler = validateRequest({ params: jobIdParamsSchema });

export const validateJobQuery: RequestHandler = validateRequest({ query: jobQuerySchema });

export const validateHrJobQuery: RequestHandler = validateRequest({ query: hrJobQuerySchema });
