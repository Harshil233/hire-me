import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { ROLES } from '../../../config/constants';
import { ProfileService } from '../profile.service';
import type { AnyProfileView, IProfileStrategy } from '../profile.interface';

const view = (role: string): AnyProfileView =>
  ({
    role,
    profile: { role },
    completion: { percentage: 0, completedWeight: 0, totalWeight: 0, items: [], missing: [] },
  }) as AnyProfileView;

const createStrategy = (role: typeof ROLES.CANDIDATE | typeof ROLES.HR): IProfileStrategy => ({
  role,
  updateSchema: z.object({ [role]: z.string().optional() }),
  getProfile: vi.fn(async () => view(role)),
  updateProfile: vi.fn(async () => view(role)),
});

describe('ProfileService', () => {
  it('dispatches a read to the strategy for the caller’s role', async () => {
    const candidate = createStrategy(ROLES.CANDIDATE);
    const hr = createStrategy(ROLES.HR);
    const service = new ProfileService([candidate, hr]);

    const result = await service.getProfile('user-1', ROLES.HR);

    expect(hr.getProfile).toHaveBeenCalledWith('user-1');
    expect(candidate.getProfile).not.toHaveBeenCalled();
    expect(result.role).toBe(ROLES.HR);
  });

  it('dispatches a write to the matching strategy', async () => {
    const candidate = createStrategy(ROLES.CANDIDATE);
    const service = new ProfileService([candidate, createStrategy(ROLES.HR)]);

    await service.updateProfile('user-1', ROLES.CANDIDATE, { firstName: 'Ada' });

    expect(candidate.updateProfile).toHaveBeenCalledWith('user-1', { firstName: 'Ada' });
  });

  it('exposes the role’s update schema', () => {
    const service = new ProfileService([createStrategy(ROLES.CANDIDATE), createStrategy(ROLES.HR)]);

    expect(service.getUpdateSchema(ROLES.CANDIDATE).safeParse({ candidate: 'x' }).success).toBe(
      true,
    );
  });

  it('fails loudly when a role has no registered strategy', async () => {
    const service = new ProfileService([createStrategy(ROLES.CANDIDATE)]);

    await expect(service.getProfile('user-1', ROLES.HR)).rejects.toMatchObject({
      statusCode: 500,
    });
    expect(() => service.getUpdateSchema(ROLES.HR)).toThrow(/No profile strategy/);
  });

  it('keeps the last strategy registered for a duplicated role', async () => {
    const first = createStrategy(ROLES.CANDIDATE);
    const second = createStrategy(ROLES.CANDIDATE);

    await new ProfileService([first, second]).getProfile('user-1', ROLES.CANDIDATE);

    expect(second.getProfile).toHaveBeenCalled();
    expect(first.getProfile).not.toHaveBeenCalled();
  });
});
