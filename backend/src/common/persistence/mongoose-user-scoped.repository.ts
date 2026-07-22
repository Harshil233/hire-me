import type { Model, Types } from 'mongoose';

import { getSession } from '../../database/mongoose-transaction-manager';
import { toObjectId, toObjectIdOrNull } from './object-id';
import { buildPartialUpdate } from './partial-update';
import type { TransactionContext } from './transaction.types';

/** The one-document-per-user profile collections all key off `userId`. */
export interface UserScopedDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * File references arrive from the HTTP layer as id strings and must be stored as
 * ObjectIds. Declared once so each profile repository only names its own fields.
 */
export const fileReferenceTransformers = (
  ...fields: readonly string[]
): Readonly<Record<string, (value: unknown) => unknown>> =>
  Object.freeze(
    Object.fromEntries(
      fields.map((field) => [
        field,
        (value: unknown): unknown => (typeof value === 'string' ? toObjectId(value) : value),
      ]),
    ),
  );

/**
 * Template for a profile keyed by its owning user — the candidate and HR profiles.
 * The ownership guard, the PATCH semantics and the transaction plumbing live here once;
 * a subclass supplies its model, its file-reference fields and a document → domain
 * mapper, and builds its own create payload (CLAUDE.md §9).
 *
 * Sibling of `MongooseOwnedRepository`, which covers the many-per-user collections.
 */
export abstract class MongooseUserScopedRepository<
  TEntity,
  TDocument extends UserScopedDocument,
  TUpdateInput extends Readonly<Record<string, unknown>>,
> {
  protected constructor(
    protected readonly model: Model<TDocument>,
    private readonly fieldTransformers: Readonly<Record<string, (value: unknown) => unknown>> = {},
  ) {}

  protected abstract toDomain(document: TDocument): TEntity;

  async findByUserId(userId: string): Promise<TEntity | null> {
    const objectId = toObjectIdOrNull(userId);
    if (objectId === null) {
      return null;
    }

    const document = await this.model
      .findOne({ userId: objectId })
      .lean<TDocument | null>()
      .exec();

    return document === null ? null : this.toDomain(document);
  }

  async update(userId: string, data: TUpdateInput): Promise<TEntity | null> {
    const objectId = toObjectIdOrNull(userId);
    if (objectId === null) {
      return null;
    }

    const document = await this.model
      .findOneAndUpdate({ userId: objectId }, buildPartialUpdate(data, this.fieldTransformers), {
        new: true,
      })
      .lean<TDocument | null>()
      .exec();

    return document === null ? null : this.toDomain(document);
  }

  /** Inserts a subclass-built payload, joining an ambient transaction when there is one. */
  protected async insert(
    payload: Readonly<Record<string, unknown>>,
    context?: TransactionContext,
  ): Promise<TEntity> {
    const session = getSession(context);
    const [created] = await this.model.create([payload], { session });

    if (created === undefined) {
      throw new Error(`${this.model.modelName} insert returned no document`);
    }

    return this.toDomain(created.toObject<TDocument>());
  }
}
