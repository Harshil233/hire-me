import { describe, expect, it, vi } from 'vitest';

import { ROLES } from '../../../config/constants';
import { UnauthorizedError } from '../../../common/errors/app-error';
import { createMockRequest, createMockResponse } from '../../../../tests/helpers/express-mocks';
import { ProfileController } from '../profile.controller';
import type { AnyProfileView, IProfileService } from '../profile.interface';

const VIEW: AnyProfileView = {
  role: ROLES.CANDIDATE,
  profile: { firstName: 'Ada' },
  completion: { percentage: 30, completedWeight: 30, totalWeight: 100, items: [], missing: [] },
};

const createService = (): IProfileService => ({
  getProfile: vi.fn(async () => VIEW),
  updateProfile: vi.fn(async () => VIEW),
  getUpdateSchema: vi.fn(),
});

describe('ProfileController', () => {
  it('returns the caller’s profile in the success envelope', async () => {
    const service = createService();
    const res = createMockResponse();

    await new ProfileController(service).get(
      createMockRequest({ auth: { userId: 'user-1', role: ROLES.CANDIDATE } }),
      res,
    );

    expect(service.getProfile).toHaveBeenCalledWith('user-1', ROLES.CANDIDATE);
    expect(res.capturedStatus).toBe(200);
    expect(res.capturedBody).toEqual({ success: true, data: VIEW });
  });

  it('forwards the validated body to the service', async () => {
    const service = createService();
    const res = createMockResponse();

    await new ProfileController(service).update(
      createMockRequest({
        auth: { userId: 'user-1', role: ROLES.CANDIDATE },
        body: { firstName: 'Grace' },
      }),
      res,
    );

    expect(service.updateProfile).toHaveBeenCalledWith('user-1', ROLES.CANDIDATE, {
      firstName: 'Grace',
    });
    expect(res.capturedBody).toEqual({ success: true, data: VIEW });
  });

  it('refuses to run without an authenticated identity', async () => {
    await expect(
      new ProfileController(createService()).get(createMockRequest(), createMockResponse()),
    ).rejects.toThrow(UnauthorizedError);
  });
});
