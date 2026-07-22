import { describe, expect, it, vi } from 'vitest';

import { ROLES } from '../../../config/constants';
import { ERROR_CODES } from '../../errors/error-codes';
import type { IAccessTokenVerifier } from '../../security/token.types';
import {
  createMockRequest,
  createMockResponse,
  createNext,
} from '../../../../tests/helpers/express-mocks';
import { createAuthenticateMiddleware } from '../authenticate.middleware';

const verifier = (payload = { sub: 'user-1', role: ROLES.CANDIDATE }): IAccessTokenVerifier => ({
  verifyAccessToken: vi.fn(() => payload),
});

describe('createAuthenticateMiddleware', () => {
  it('attaches the identity from a valid bearer token', () => {
    const req = createMockRequest({ headers: { authorization: 'Bearer good-token' } });
    const next = createNext();
    const tokenVerifier = verifier();

    createAuthenticateMiddleware(tokenVerifier)(req, createMockResponse(), next);

    expect(tokenVerifier.verifyAccessToken).toHaveBeenCalledWith('good-token');
    expect(req.auth).toEqual({ userId: 'user-1', role: ROLES.CANDIDATE });
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a missing Authorization header', () => {
    const next = createNext();

    createAuthenticateMiddleware(verifier())(createMockRequest(), createMockResponse(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, code: ERROR_CODES.UNAUTHENTICATED }),
    );
  });

  it('rejects a non-bearer scheme', () => {
    const req = createMockRequest({ headers: { authorization: 'Basic abc123' } });
    const next = createNext();

    createAuthenticateMiddleware(verifier())(req, createMockResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    expect(req.auth).toBeUndefined();
  });

  it('rejects an empty bearer value', () => {
    const req = createMockRequest({ headers: { authorization: 'Bearer    ' } });
    const next = createNext();

    createAuthenticateMiddleware(verifier())(req, createMockResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('forwards a verification failure to the error handler', () => {
    const failing: IAccessTokenVerifier = {
      verifyAccessToken: vi.fn(() => {
        throw new Error('boom');
      }),
    };
    const req = createMockRequest({ headers: { authorization: 'Bearer bad-token' } });
    const next = createNext();

    createAuthenticateMiddleware(failing)(req, createMockResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
  });
});
