import { describe, expect, it } from 'vitest';

import { ROLES } from '../../../config/constants';
import { ERROR_CODES } from '../../errors/error-codes';
import { UnauthorizedError } from '../../errors/app-error';
import {
  createMockRequest,
  createMockResponse,
  createNext,
} from '../../../../tests/helpers/express-mocks';
import { authorize, requireAuth } from '../authorize.middleware';

describe('authorize', () => {
  it('lets an allowed role through', () => {
    const req = createMockRequest({ auth: { userId: 'user-1', role: ROLES.HR } });
    const next = createNext();

    authorize(ROLES.HR)(req, createMockResponse(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('accepts any role from the allow-list', () => {
    const req = createMockRequest({ auth: { userId: 'user-1', role: ROLES.CANDIDATE } });
    const next = createNext();

    authorize(ROLES.HR, ROLES.CANDIDATE)(req, createMockResponse(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a role that is not allowed', () => {
    const req = createMockRequest({ auth: { userId: 'user-1', role: ROLES.CANDIDATE } });
    const next = createNext();

    authorize(ROLES.HR)(req, createMockResponse(), next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, code: ERROR_CODES.ROLE_FORBIDDEN }),
    );
  });

  it('rejects an unauthenticated request', () => {
    const next = createNext();

    authorize(ROLES.HR)(createMockRequest(), createMockResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});

describe('requireAuth', () => {
  it('returns the identity when present', () => {
    const auth = { userId: 'user-1', role: ROLES.CANDIDATE };

    expect(requireAuth(createMockRequest({ auth }))).toEqual(auth);
  });

  it('throws when the route was not guarded', () => {
    expect(() => requireAuth(createMockRequest())).toThrow(UnauthorizedError);
  });
});
