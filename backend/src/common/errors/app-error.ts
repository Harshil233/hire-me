import { ERROR_CODES, type ErrorCode } from './error-codes';

/** Per-field detail attached to a validation-style failure. */
export interface ErrorDetail {
  readonly field: string;
  readonly message: string;
}

/**
 * Root of the single error hierarchy (CLAUDE.md §13). Anything thrown that is not an
 * `AppError` is treated as an unexpected fault by the error middleware.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details: readonly ErrorDetail[];
  /** `true` when the failure is an expected outcome rather than a bug. */
  readonly isOperational = true;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details: readonly ErrorDetail[] = [],
  ) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, new.target);
  }
}

export class ValidationError extends AppError {
  constructor(
    message = 'The submitted data is invalid',
    details: readonly ErrorDetail[] = [],
    code: ErrorCode = ERROR_CODES.VALIDATION_ERROR,
  ) {
    super(422, code, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication is required', code: ErrorCode = ERROR_CODES.UNAUTHENTICATED) {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You are not allowed to perform this action', code: ErrorCode = ERROR_CODES.FORBIDDEN) {
    super(403, code, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code: ErrorCode = ERROR_CODES.NOT_FOUND) {
    super(404, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists', code: ErrorCode = ERROR_CODES.CONFLICT) {
    super(409, code, message);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'The uploaded file is too large', code: ErrorCode = ERROR_CODES.FILE_TOO_LARGE) {
    super(413, code, message);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(429, ERROR_CODES.RATE_LIMITED, message);
  }
}

export class InternalError extends AppError {
  constructor(message = 'Something went wrong') {
    super(500, ERROR_CODES.INTERNAL_ERROR, message);
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;
