import type { ZodType } from 'zod';

import type { Role } from '../../config/constants';
import { InternalError } from '../../common/errors/app-error';
import type { AnyProfileView, IProfileService, IProfileStrategy } from './profile.interface';

/**
 * Dispatches profile reads and writes to the strategy registered for the caller's role.
 * Adding a third role means registering one more strategy — no branching here (OCP).
 */
export class ProfileService implements IProfileService {
  private readonly strategies: ReadonlyMap<Role, IProfileStrategy>;

  constructor(strategies: readonly IProfileStrategy[]) {
    this.strategies = new Map(strategies.map((strategy) => [strategy.role, strategy]));
  }

  // `async` so a wiring error rejects the promise rather than throwing synchronously.
  async getProfile(userId: string, role: Role): Promise<AnyProfileView> {
    return this.resolve(role).getProfile(userId);
  }

  async updateProfile(userId: string, role: Role, input: unknown): Promise<AnyProfileView> {
    return this.resolve(role).updateProfile(userId, input);
  }

  getUpdateSchema(role: Role): ZodType {
    return this.resolve(role).updateSchema;
  }

  private resolve(role: Role): IProfileStrategy {
    const strategy = this.strategies.get(role);

    if (strategy === undefined) {
      // A missing strategy is a wiring bug, never a client mistake.
      throw new InternalError(`No profile strategy registered for role "${role}"`);
    }

    return strategy;
  }
}
