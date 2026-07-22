import type { ZodType } from 'zod';

import type { Role } from '../../config/constants';
import type { ProfileCompletion } from '../../common/utils/completion';
import { createToken, type Token } from '../../container/token';

/** Uniform shape returned by every role's profile endpoint. */
export interface ProfileView<TProfile> {
  readonly role: Role;
  readonly profile: TProfile;
  readonly completion: ProfileCompletion;
}

export type AnyProfileView = ProfileView<unknown>;

/** Strategy: one implementation per role, resolved from a map — no `if (role === …)`. */
export interface IProfileStrategy<TUpdateInput = unknown> {
  readonly role: Role;
  /** Used by the validator to parse the body with this role's rules. */
  readonly updateSchema: ZodType<TUpdateInput>;
  getProfile(userId: string): Promise<AnyProfileView>;
  updateProfile(userId: string, input: TUpdateInput): Promise<AnyProfileView>;
}

/** Scoring strategy for a role's profile. */
export interface ICompletionCalculator<TSubject> {
  calculate(subject: TSubject): ProfileCompletion;
}

export interface IProfileService {
  getProfile(userId: string, role: Role): Promise<AnyProfileView>;
  updateProfile(userId: string, role: Role, input: unknown): Promise<AnyProfileView>;
  /** Exposes the role's schema so the validator can produce a 422 at the HTTP edge. */
  getUpdateSchema(role: Role): ZodType;
}

export const PROFILE_SERVICE: Token<IProfileService> = createToken('IProfileService');
