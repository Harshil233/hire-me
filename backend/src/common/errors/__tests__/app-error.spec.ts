import { describe, expect, it } from 'vitest';

import {
  AppError,
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  PayloadTooLargeError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
  isAppError,
} from '../app-error';
import { ERROR_CODES } from '../error-codes';

describe('AppError hierarchy', () => {
  it('carries status, code, message and details', () => {
    const error = new AppError(418, ERROR_CODES.CONFLICT, 'teapot', [
      { field: 'a', message: 'bad' },
    ]);

    expect(error.statusCode).toBe(418);
    expect(error.code).toBe(ERROR_CODES.CONFLICT);
    expect(error.message).toBe('teapot');
    expect(error.details).toEqual([{ field: 'a', message: 'bad' }]);
    expect(error.isOperational).toBe(true);
    expect(error.stack).toBeDefined();
  });

  it('names each subclass after itself', () => {
    expect(new NotFoundError().name).toBe('NotFoundError');
    expect(new ConflictError().name).toBe('ConflictError');
  });

  it.each([
    [new ValidationError(), 422, ERROR_CODES.VALIDATION_ERROR],
    [new UnauthorizedError(), 401, ERROR_CODES.UNAUTHENTICATED],
    [new ForbiddenError(), 403, ERROR_CODES.FORBIDDEN],
    [new NotFoundError(), 404, ERROR_CODES.NOT_FOUND],
    [new ConflictError(), 409, ERROR_CODES.CONFLICT],
    [new PayloadTooLargeError(), 413, ERROR_CODES.FILE_TOO_LARGE],
    [new TooManyRequestsError(), 429, ERROR_CODES.RATE_LIMITED],
    [new InternalError(), 500, ERROR_CODES.INTERNAL_ERROR],
  ])('maps %s to its status and default code', (error, status, code) => {
    expect(error.statusCode).toBe(status);
    expect(error.code).toBe(code);
    expect(error.message.length).toBeGreaterThan(0);
  });

  it('accepts a module-specific code override', () => {
    const error = new NotFoundError('User not found', ERROR_CODES.USER_NOT_FOUND);

    expect(error.code).toBe(ERROR_CODES.USER_NOT_FOUND);
    expect(error.statusCode).toBe(404);
  });

  it('defaults details to an empty list', () => {
    expect(new ValidationError().details).toEqual([]);
  });

  it('recognises its own instances only', () => {
    expect(isAppError(new NotFoundError())).toBe(true);
    expect(isAppError(new Error('plain'))).toBe(false);
    expect(isAppError('not an error')).toBe(false);
    expect(isAppError(null)).toBe(false);
  });
});
