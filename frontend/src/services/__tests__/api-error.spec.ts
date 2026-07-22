import { describe, expect, it } from 'vitest';

import {
  ApiError,
  NETWORK_ERROR_CODE,
  UNEXPECTED_RESPONSE_CODE,
  isApiError,
  toApiError,
} from '../api-error';

describe('ApiError', () => {
  it('exposes status, code, message and details', () => {
    const error = new ApiError(422, 'VALIDATION_ERROR', 'Invalid', [
      { field: 'email', message: 'required' },
    ]);

    expect(error.status).toBe(422);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toHaveLength(1);
    expect(error.isValidationError).toBe(true);
    expect(error.isUnauthorized).toBe(false);
  });

  it('flags an unauthorized failure', () => {
    expect(new ApiError(401, 'UNAUTHENTICATED', 'nope').isUnauthorized).toBe(true);
  });

  it('is detectable through the type guard', () => {
    expect(isApiError(new ApiError(500, 'X', 'y'))).toBe(true);
    expect(isApiError(new Error('plain'))).toBe(false);
    expect(isApiError(undefined)).toBe(false);
  });
});

describe('toApiError', () => {
  it('reads the API failure envelope', () => {
    const error = toApiError(409, {
      success: false,
      error: { code: 'EMAIL_ALREADY_EXISTS', message: 'Taken', details: [] },
    });

    expect(error.status).toBe(409);
    expect(error.code).toBe('EMAIL_ALREADY_EXISTS');
    expect(error.message).toBe('Taken');
  });

  it('keeps per-field details', () => {
    const error = toApiError(422, {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid',
        details: [{ field: 'password', message: 'too weak' }],
      },
    });

    expect(error.details).toEqual([{ field: 'password', message: 'too weak' }]);
  });

  it('defaults missing details to an empty list', () => {
    const error = toApiError(404, {
      success: false,
      error: { code: 'NOT_FOUND', message: 'Gone' },
    });

    expect(error.details).toEqual([]);
  });

  it('reports a transport failure when there is no status', () => {
    const error = toApiError(undefined, undefined);

    expect(error.code).toBe(NETWORK_ERROR_CODE);
    expect(error.status).toBe(0);
    expect(error.message).toMatch(/could not reach the server/i);
  });

  it('falls back to a generic message for an unrecognised body', () => {
    const error = toApiError(500, '<html>gateway error</html>');

    expect(error.code).toBe(UNEXPECTED_RESPONSE_CODE);
    expect(error.message).not.toContain('html');
  });
});
