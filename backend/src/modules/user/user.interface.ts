import type { Role } from '../../config/constants';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import { createToken, type Token } from '../../container/token';

/** Account identity. Role-specific data lives in the matching profile document. */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly role: Role;
  readonly isActive: boolean;
  readonly lastLoginAt?: Date | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** Only the auth service ever sees the credential hash. */
export interface UserWithSecret extends User {
  readonly passwordHash: string;
}

export interface CreateUserInput {
  readonly email: string;
  readonly passwordHash: string;
  readonly role: Role;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  /** Batched read, so addressing a campaign is one query rather than one per recipient. */
  findManyByIds(ids: readonly string[]): Promise<User[]>;
  findByEmail(email: string): Promise<UserWithSecret | null>;
  existsByEmail(email: string): Promise<boolean>;
  create(input: CreateUserInput, context?: TransactionContext): Promise<User>;
  markLoggedIn(id: string, loggedInAt: Date): Promise<void>;
}

export interface IUserService {
  getById(id: string): Promise<User>;
  assertEmailAvailable(email: string): Promise<void>;
}

export const USER_REPOSITORY: Token<IUserRepository> = createToken('IUserRepository');
export const USER_SERVICE: Token<IUserService> = createToken('IUserService');
