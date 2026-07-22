import { MulterError } from 'multer';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ERROR_CODES } from '../../errors/error-codes';
import { ConflictError, NotFoundError } from '../../errors/app-error';
import type { ErrorResponseBody } from '../../http/api-response';
import { createFakeLogger } from '../../../../tests/helpers/fakes';
import {
  createMockRequest,
  createMockResponse,
  createNext,
} from '../../../../tests/helpers/express-mocks';
import {
  createErrorHandler,
  normalizeError,
  notFoundHandler,
} from '../error-handler.middleware';

describe('normalizeError', () => {
  it('passes an AppError through unchanged', () => {
    const original = new ConflictError('taken', ERROR_CODES.EMAIL_ALREADY_EXISTS);

    expect(normalizeError(original)).toBe(original);
  });

  it('converts a ZodError into a 422 with details', () => {
    const result = z.object({ a: z.string() }).safeParse({});
    const normalized = normalizeError(result.error);

    expect(normalized.statusCode).toBe(422);
    expect(normalized.details[0]?.field).toBe('a');
  });

  it('converts an oversized upload into a 413', () => {
    expect(normalizeError(new MulterError('LIMIT_FILE_SIZE')).statusCode).toBe(413);
  });

  it('converts other multer failures into a 422', () => {
    const normalized = normalizeError(new MulterError('LIMIT_UNEXPECTED_FILE'));

    expect(normalized.statusCode).toBe(422);
    expect(normalized.message).toMatch(/File upload rejected/);
  });

  it('converts a Mongo duplicate key error into a 409', () => {
    expect(normalizeError({ code: 11_000 }).statusCode).toBe(409);
  });

  it('converts an oversized JSON body into a 413', () => {
    expect(normalizeError({ type: 'entity.too.large', status: 413 }).statusCode).toBe(413);
  });

  it('converts malformed JSON into a 422', () => {
    const normalized = normalizeError({ type: 'entity.parse.failed', status: 400 });

    expect(normalized.statusCode).toBe(422);
    expect(normalized.message).toMatch(/not valid JSON/);
  });

  it('hides an unexpected fault behind a generic 500', () => {
    const normalized = normalizeError(new Error('connection string leaked: mongodb://secret'));

    expect(normalized.statusCode).toBe(500);
    expect(normalized.message).toBe('Something went wrong');
    expect(normalized.message).not.toContain('mongodb');
  });

  it.each([null, undefined, 'a string', 42])('treats %s as an internal error', (value) => {
    expect(normalizeError(value).statusCode).toBe(500);
  });
});

describe('createErrorHandler', () => {
  it('answers with the standard failure envelope', () => {
    const res = createMockResponse();

    createErrorHandler(createFakeLogger())(
      new NotFoundError('User not found', ERROR_CODES.USER_NOT_FOUND),
      createMockRequest(),
      res,
      createNext(),
    );

    expect(res.capturedStatus).toBe(404);
    expect(res.capturedBody).toEqual({
      success: false,
      error: { code: ERROR_CODES.USER_NOT_FOUND, message: 'User not found', details: [] },
    });
  });

  it('logs client errors at warn level with the request id', () => {
    const logger = createFakeLogger();

    createErrorHandler(logger)(
      new NotFoundError(),
      createMockRequest({ requestId: 'req-42', method: 'GET', originalUrl: '/api/v1/x' }),
      createMockResponse(),
      createNext(),
    );

    expect(logger.warn).toHaveBeenCalledWith(
      'Resource not found',
      expect.objectContaining({ requestId: 'req-42', method: 'GET', path: '/api/v1/x' }),
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs server errors at error level including the stack', () => {
    const logger = createFakeLogger();

    createErrorHandler(logger)(
      new Error('kaboom'),
      createMockRequest(),
      createMockResponse(),
      createNext(),
    );

    expect(logger.error).toHaveBeenCalledWith(
      'Something went wrong',
      expect.objectContaining({ stack: expect.stringContaining('kaboom') as string }),
    );
  });

  it('never leaks a stack trace to the client', () => {
    const res = createMockResponse();

    createErrorHandler(createFakeLogger())(
      new Error('sensitive detail'),
      createMockRequest(),
      res,
      createNext(),
    );

    expect(JSON.stringify(res.capturedBody)).not.toContain('sensitive detail');
    expect((res.capturedBody as ErrorResponseBody).error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
  });
});

describe('notFoundHandler', () => {
  it('produces a route-specific 404', () => {
    const next = vi.fn();

    notFoundHandler(
      createMockRequest({ method: 'DELETE', originalUrl: '/api/v1/nope' }),
      createMockResponse(),
      next,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        code: ERROR_CODES.ROUTE_NOT_FOUND,
        message: 'Route DELETE /api/v1/nope does not exist',
      }),
    );
  });
});
