import type { RequestHandler } from 'express';

import { validateRequest } from '../../common/middlewares/validate.middleware';
import { loginSchema, registerCandidateSchema, registerHrSchema } from './auth.schema';

export const validateRegisterCandidate: RequestHandler = validateRequest({
  body: registerCandidateSchema,
});

export const validateRegisterHr: RequestHandler = validateRequest({ body: registerHrSchema });

export const validateLogin: RequestHandler = validateRequest({ body: loginSchema });
