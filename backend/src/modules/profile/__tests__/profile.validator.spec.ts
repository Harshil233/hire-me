import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ROLES } from '../../../config/constants';
import { UnauthorizedError, type ValidationError } from '../../../common/errors/app-error';
import {
  createMockRequest,
  createMockResponse,
  createNext,
} from '../../../../tests/helpers/express-mocks';
import type { IProfileService } from '../profile.interface';
import { createProfileUpdateValidator } from '../profile.validator';

const candidateSchema = z.object({ firstName: z.string().min(1) });
const hrSchema = z.object({ designation: z.string().min(1) });

const createService = (): IProfileService => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  getUpdateSchema: vi.fn((role) => (role === ROLES.HR ? hrSchema : candidateSchema)),
});

describe('createProfileUpdateValidator', () => {
  it('validates with the schema of the authenticated role', () => {
    const service = createService();
    const req = createMockRequest({
      auth: { userId: 'user-1', role: ROLES.HR },
      body: { designation: 'Talent Lead' },
    });
    const next = createNext();

    createProfileUpdateValidator(service)(req, createMockResponse(), next);

    expect(service.getUpdateSchema).toHaveBeenCalledWith(ROLES.HR);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a body that is valid for the other role', () => {
    const req = createMockRequest({
      auth: { userId: 'user-1', role: ROLES.HR },
      body: { firstName: 'Ada' },
    });
    const next = createNext();

    createProfileUpdateValidator(createService())(req, createMockResponse(), next);

    const error = next.mock.calls[0]?.[0] as ValidationError;
    expect(error.statusCode).toBe(422);
    expect(error.details[0]?.field).toBe('designation');
  });

  it('refuses an unauthenticated request', () => {
    expect(() =>
      createProfileUpdateValidator(createService())(
        createMockRequest(),
        createMockResponse(),
        createNext(),
      ),
    ).toThrow(UnauthorizedError);
  });
});
