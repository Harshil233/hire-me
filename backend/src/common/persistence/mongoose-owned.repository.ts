import type { Model, SortOrder, UpdateQuery } from 'mongoose';

import { toIdString, toObjectId, toObjectIdOrNull } from './object-id';
import type {
  IOwnedResourceRepository,
  OwnedDocument,
  OwnedEntity,
} from './owned-resource.types';

/**
 * Template for every user-owned collection. Subclasses supply the model, the sort
 * order, the editable field list and a document → domain mapper; the CRUD and the
 * ownership scoping live here once.
 */
export abstract class MongooseOwnedRepository<
  TEntity extends OwnedEntity,
  TDocument extends OwnedDocument,
  TInput,
> implements IOwnedResourceRepository<TEntity, TInput>
{
  protected constructor(
    protected readonly model: Model<TDocument>,
    /** Fields a client may write. Anything absent from an update is cleared. */
    private readonly editableFields: readonly string[],
    private readonly sort: Readonly<Record<string, SortOrder>>,
  ) {}

  protected abstract toDomain(document: TDocument): TEntity;

  async listByUser(userId: string): Promise<TEntity[]> {
    const objectId = toObjectIdOrNull(userId);
    if (objectId === null) {
      return [];
    }

    const documents = await this.model
      .find({ userId: objectId })
      .sort(this.sort)
      .lean<TDocument[]>()
      .exec();

    return documents.map((document) => this.toDomain(document));
  }

  async findByIdForUser(id: string, userId: string): Promise<TEntity | null> {
    const objectId = toObjectIdOrNull(id);
    const ownerId = toObjectIdOrNull(userId);
    if (objectId === null || ownerId === null) {
      return null;
    }

    const document = await this.model
      .findOne({ _id: objectId, userId: ownerId })
      .lean<TDocument | null>()
      .exec();

    return document === null ? null : this.toDomain(document);
  }

  async create(userId: string, data: TInput): Promise<TEntity> {
    const payload = {
      ...(data as Record<string, unknown>),
      userId: toObjectId(userId),
    } as unknown as TDocument;

    const [created] = await this.model.create([payload]);

    if (created === undefined) {
      throw new Error(`${this.model.modelName} insert returned no document`);
    }

    return this.toDomain(created.toObject<TDocument>());
  }

  async update(id: string, userId: string, data: TInput): Promise<TEntity | null> {
    const objectId = toObjectIdOrNull(id);
    const ownerId = toObjectIdOrNull(userId);
    if (objectId === null || ownerId === null) {
      return null;
    }

    const document = await this.model
      .findOneAndUpdate({ _id: objectId, userId: ownerId }, this.buildUpdate(data), { new: true })
      .lean<TDocument | null>()
      .exec();

    return document === null ? null : this.toDomain(document);
  }

  async deleteForUser(id: string, userId: string): Promise<boolean> {
    const objectId = toObjectIdOrNull(id);
    const ownerId = toObjectIdOrNull(userId);
    if (objectId === null || ownerId === null) {
      return false;
    }

    const result = await this.model.deleteOne({ _id: objectId, userId: ownerId }).exec();
    return result.deletedCount === 1;
  }

  async countByUser(userId: string): Promise<number> {
    const objectId = toObjectIdOrNull(userId);
    if (objectId === null) {
      return 0;
    }
    return this.model.countDocuments({ userId: objectId }).exec();
  }

  /**
   * PUT semantics: an editable field that the client omitted is removed, so the saved
   * record always mirrors the submitted form exactly.
   */
  private buildUpdate(data: TInput): UpdateQuery<TDocument> {
    const source = data as Record<string, unknown>;
    const set: Record<string, unknown> = {};
    const unset: Record<string, ''> = {};

    for (const field of this.editableFields) {
      const value = source[field];
      if (value === undefined) {
        unset[field] = '';
      } else {
        set[field] = value;
      }
    }

    return {
      ...(Object.keys(set).length > 0 ? { $set: set } : {}),
      ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
    };
  }

  /** Shared part of every subclass mapper. */
  protected static baseFields(document: OwnedDocument): OwnedEntity {
    return {
      id: toIdString(document._id),
      userId: toIdString(document.userId),
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
