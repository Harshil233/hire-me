import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ERROR_CODES } from '../../errors/error-codes';
import type { ValidationError } from '../../errors/app-error';
import {
  createMockRequest,
  createMockResponse,
  createNext,
} from '../../../../tests/helpers/express-mocks';
import { validateRequest } from '../validate.middleware';

const bodySchema = z.object({ email: z.email(), age: z.coerce.number().int() });
const paramsSchema = z.object({ id: z.string().min(3) });
const querySchema = z.object({ page: z.coerce.number().default(1) });

describe('validateRequest', () => {
  it('passes a valid body through and writes back the parsed value', () => {
    const req = createMockRequest({ body: { email: 'a@b.com', age: '42' } });
    const next = createNext();

    validateRequest({ body: bodySchema })(req, createMockResponse(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ email: 'a@b.com', age: 42 });
  });

  it('rejects an invalid body with a 422 and per-field details', () => {
    const req = createMockRequest({ body: { email: 'nope', age: 'x' } });
    const next = createNext();

    validateRequest({ body: bodySchema })(req, createMockResponse(), next);

    const error = next.mock.calls[0]?.[0] as ValidationError;
    expect(error.statusCode).toBe(422);
    expect(error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(error.details.map((detail) => detail.field).sort()).toEqual(['age', 'email']);
  });

  it('validates path parameters', () => {
    const req = createMockRequest({ params: { id: 'ab' } });
    const next = createNext();

    validateRequest({ params: paramsSchema })(req, createMockResponse(), next);

    expect((next.mock.calls[0]?.[0] as ValidationError).message).toBe('Invalid path parameters');
  });

  it('validates and replaces the query even though it is a getter in Express 5', () => {
    const req = createMockRequest({ query: {} });
    const next = createNext();

    validateRequest({ query: querySchema })(req, createMockResponse(), next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({ page: 1 });
  });

  it('reports an invalid query distinctly', () => {
    const req = createMockRequest({ query: { page: 'abc' } });
    const next = createNext();

    validateRequest({ query: querySchema })(req, createMockResponse(), next);

    expect((next.mock.calls[0]?.[0] as ValidationError).message).toBe('Invalid query parameters');
  });

  it('stops at the first failing section', () => {
    const req = createMockRequest({ params: { id: 'x' }, body: { email: 'nope' } });
    const next = createNext();

    validateRequest({ params: paramsSchema, body: bodySchema })(req, createMockResponse(), next);

    expect(next).toHaveBeenCalledOnce();
    expect((next.mock.calls[0]?.[0] as ValidationError).message).toBe('Invalid path parameters');
  });

  it('is a no-op when no schema is supplied', () => {
    const next = createNext();

    validateRequest({})(createMockRequest(), createMockResponse(), next);

    expect(next).toHaveBeenCalledWith();
  });
});
