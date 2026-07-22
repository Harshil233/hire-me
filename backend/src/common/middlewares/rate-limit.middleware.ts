import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import type { NextFunction, Request, Response } from 'express';

import { TooManyRequestsError } from '../errors/app-error';

export interface RateLimitOptions {
  readonly windowMs: number;
  readonly max: number;
}

/**
 * Rate limiter that hands a `TooManyRequestsError` to the error middleware rather than
 * writing its own body. The envelope is therefore built in exactly one place, and a
 * throttled request is logged with its request id like any other failure (CLAUDE.md §13).
 */
export const createRateLimiter = (options: RateLimitOptions): RateLimitRequestHandler =>
  rateLimit({
    windowMs: options.windowMs,
    limit: options.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req: Request, _res: Response, next: NextFunction): void => {
      next(new TooManyRequestsError());
    },
  });
