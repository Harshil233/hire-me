import { describe, expect, it } from 'vitest';

import { ERROR_CODES } from '../../errors/error-codes';
import { createMockResponse } from '../../../../tests/helpers/express-mocks';
import {
  HTTP_STATUS,
  buildErrorBody,
  buildSuccessBody,
  sendNoContent,
  sendSuccess,
} from '../api-response';

describe('buildSuccessBody', () => {
  it('wraps the payload in the agreed envelope', () => {
    expect(buildSuccessBody({ id: '1' })).toEqual({ success: true, data: { id: '1' } });
  });

  it('supports a null payload', () => {
    expect(buildSuccessBody(null)).toEqual({ success: true, data: null });
  });
});

describe('buildErrorBody', () => {
  it('wraps code, message and details', () => {
    expect(
      buildErrorBody(ERROR_CODES.USER_NOT_FOUND, 'User not found', [
        { field: 'id', message: 'unknown' },
      ]),
    ).toEqual({
      success: false,
      error: {
        code: ERROR_CODES.USER_NOT_FOUND,
        message: 'User not found',
        details: [{ field: 'id', message: 'unknown' }],
      },
    });
  });

  it('defaults details to an empty list', () => {
    expect(buildErrorBody(ERROR_CODES.INTERNAL_ERROR, 'boom').error.details).toEqual([]);
  });
});

describe('sendSuccess', () => {
  it('defaults to 200', () => {
    const res = createMockResponse();

    sendSuccess(res, { ok: true });

    expect(res.capturedStatus).toBe(HTTP_STATUS.OK);
    expect(res.capturedBody).toEqual({ success: true, data: { ok: true } });
  });

  it('honours an explicit status', () => {
    const res = createMockResponse();

    sendSuccess(res, { ok: true }, HTTP_STATUS.CREATED);

    expect(res.capturedStatus).toBe(201);
  });
});

describe('sendNoContent', () => {
  it('answers 204 with an empty body', () => {
    const res = createMockResponse();

    sendNoContent(res);

    expect(res.capturedStatus).toBe(204);
    expect(res.send).toHaveBeenCalledWith();
  });
});
