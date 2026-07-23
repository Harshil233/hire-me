import type { RequestHandler } from 'express';

import { validateRequest } from '../../common/middlewares/validate.middleware';
import { candidateQuerySchema } from './candidate.schema';

export const validateCandidateQuery: RequestHandler = validateRequest({
  query: candidateQuerySchema,
});
