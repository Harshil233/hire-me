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

/**
 * Reads the parsed query string. `validateRequest` has already replaced `req.query` with
 * the schema's output, but Express types that property as `ParsedQs` — string-valued by
 * definition — so a coerced number cannot be expressed through the `Request` generic.
 * The narrowing lives here, once, next to the assignment that makes it true.
 *
 * The type parameter appears only in the return position because that is the whole point:
 * this is a single, documented cast, and the caller names the shape its validator produced.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export const validatedQuery = <TQuery>(req: Request): TQuery => req.query as unknown as TQuery;
