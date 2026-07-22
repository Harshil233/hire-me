import type { Types } from 'mongoose';

/**
 * Contracts for user-owned collections (experience, education, certification, project).
 * Written once here so the four modules stay free of duplicated CRUD (CLAUDE.md §9).
 */

export interface OwnedEntity {
  readonly id: string;
  readonly userId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface OwnedDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOwnedResourceRepository<TEntity extends OwnedEntity, TInput> {
  listByUser(userId: string): Promise<TEntity[]>;
  findByIdForUser(id: string, userId: string): Promise<TEntity | null>;
  create(userId: string, data: TInput): Promise<TEntity>;
  update(id: string, userId: string, data: TInput): Promise<TEntity | null>;
  deleteForUser(id: string, userId: string): Promise<boolean>;
  countByUser(userId: string): Promise<number>;
}

/** Narrow port used by the profile-completion calculators (ISP). */
export interface IOwnedResourceCounter {
  countByUser(userId: string): Promise<number>;
}

export interface IOwnedResourceService<TEntity extends OwnedEntity, TInput>
  extends IOwnedResourceCounter {
  list(userId: string): Promise<TEntity[]>;
  get(id: string, userId: string): Promise<TEntity>;
  create(userId: string, data: TInput): Promise<TEntity>;
  update(id: string, userId: string, data: TInput): Promise<TEntity>;
  remove(id: string, userId: string): Promise<void>;
}
