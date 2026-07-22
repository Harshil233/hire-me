import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';

import { ERROR_CODES } from '../errors/error-codes';
import {
  AppError,
  ConflictError,
  InternalError,
  NotFoundError,
  PayloadTooLargeError,
  ValidationError,
  isAppError,
} from '../errors/app-error';
import { buildErrorBody } from '../http/api-response';
import type { ILogger } from '../types/logger';
import { toErrorDetails } from '../utils/zod-details';

/** Body-parser failures expose `type` and `status`; neither is on the `Error` type. */
const isBodyParserError = (error: unknown): error is { type: string } =>
  typeof error === 'object' && error !== null && 'type' in error && typeof error.type === 'string';

/** Mongo duplicate-key failures surface as code 11000 on the driver error. */
const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 11_000;

/** Translates anything thrown in the request pipeline into a known `AppError`. */
export const normalizeError = (error: unknown): AppError => {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ValidationError('The submitted data is invalid', toErrorDetails(error));
  }

  if (error instanceof MulterError) {
    return error.code === 'LIMIT_FILE_SIZE'
      ? new PayloadTooLargeError()
      : new ValidationError(`File upload rejected: ${error.message}`);
  }

  if (isDuplicateKeyError(error)) {
    return new ConflictError('That record already exists', ERROR_CODES.CONFLICT);
  }

  if (isBodyParserError(error)) {
    if (error.type === 'entity.too.large') {
      return new PayloadTooLargeError('Request body is too large');
    }
    if (error.type === 'entity.parse.failed') {
      return new ValidationError('Request body is not valid JSON');
    }
  }

  return new InternalError();
};

/**
 * The only place an error response is formatted (CLAUDE.md §13). Unexpected faults are
 * logged with the request id and answered with a generic message — no stack traces,
 * SQL or driver text ever reaches the client.
 */
export const createErrorHandler = (logger: ILogger): ErrorRequestHandler => {
  return (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const appError = normalizeError(error);
    const logContext = {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: appError.statusCode,
      code: appError.code,
    };

    if (appError.statusCode >= 500) {
      logger.error(appError.message, {
        ...logContext,
        stack: error instanceof Error ? error.stack : undefined,
      });
    } else {
      logger.warn(appError.message, logContext);
    }

    res
      .status(appError.statusCode)
      .json(buildErrorBody(appError.code, appError.message, appError.details));
  };
};

/** Terminal 404 for unmatched routes. */
export const notFoundHandler: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  next(
    new NotFoundError(`Route ${req.method} ${req.originalUrl} does not exist`, ERROR_CODES.ROUTE_NOT_FOUND),
  );
};
