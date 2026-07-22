import { describe, expect, it } from 'vitest';

import { REQUEST_ID_HEADER } from '../../../config/constants';
import {
  createMockRequest,
  createMockResponse,
  createNext,
} from '../../../../tests/helpers/express-mocks';
import { createRequestIdMiddleware } from '../request-id.middleware';

describe('createRequestIdMiddleware', () => {
  it('generates an id when the header is absent', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createNext();

    createRequestIdMiddleware(() => 'generated-id')(req, res, next);

    expect(req.requestId).toBe('generated-id');
    expect(res.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, 'generated-id');
    expect(next).toHaveBeenCalledOnce();
  });

  it('honours an inbound correlation id', () => {
    const req = createMockRequest({ headers: { [REQUEST_ID_HEADER]: 'inbound-id' } });

    createRequestIdMiddleware(() => 'generated-id')(req, createMockResponse(), createNext());

    expect(req.requestId).toBe('inbound-id');
  });

  it('falls back to a generated id when the header is empty', () => {
    const req = createMockRequest({ headers: { [REQUEST_ID_HEADER]: '' } });

    createRequestIdMiddleware(() => 'generated-id')(req, createMockResponse(), createNext());

    expect(req.requestId).toBe('generated-id');
  });

  it('defaults to a random UUID generator', () => {
    const req = createMockRequest();

    createRequestIdMiddleware()(req, createMockResponse(), createNext());

    expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });
});
