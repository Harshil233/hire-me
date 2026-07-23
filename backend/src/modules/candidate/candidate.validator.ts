import type { RequestHandler } from 'express';

import { validateRequest } from '../../common/middlewares/validate.middleware';
import { candidateQuerySchema, candidateUserIdParamsSchema } from './candidate.schema';

export const validateCandidateQuery: RequestHandler = validateRequest({
  query: candidateQuerySchema,
});

export const validateCandidateUserIdParam: RequestHandler = validateRequest({
  params: candidateUserIdParamsSchema,
});
