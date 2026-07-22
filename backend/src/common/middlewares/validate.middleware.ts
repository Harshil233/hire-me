import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

import { ValidationError } from '../errors/app-error';
import { toErrorDetails } from '../utils/zod-details';

export interface RequestSchemas {
  readonly body?: ZodType;
  readonly params?: ZodType;
  readonly query?: ZodType;
}

/**
 * The single Zod → HTTP bridge. Every module's `*.validator.ts` builds its middlewares
 * from this factory, so the 422 shape is defined in exactly one place (CLAUDE.md §9).
 *
 * Parsed (and therefore coerced/defaulted) values replace the raw input, so controllers
 * always read validated data.
 */
export const validateRequest = (schemas: RequestSchemas): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.params !== undefined) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        next(new ValidationError('Invalid path parameters', toErrorDetails(result.error)));
        return;
      }
      req.params = result.data as Request['params'];
    }

    if (schemas.query !== undefined) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        next(new ValidationError('Invalid query parameters', toErrorDetails(result.error)));
        return;
      }
      // `req.query` is a getter in Express 5, so it cannot be assigned directly.
      Object.defineProperty(req, 'query', {
        value: result.data,
        writable: true,
        configurable: true,
      });
    }

    if (schemas.body !== undefined) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        next(new ValidationError('The submitted data is invalid', toErrorDetails(result.error)));
        return;
      }
      req.body = result.data;
    }

    next();
  };
};
