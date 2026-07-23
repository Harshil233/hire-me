import type { Model } from 'mongoose';

import type { TransactionContext } from '../../common/persistence/transaction.types';
import { toIdString, toObjectIdOrNull } from '../../common/persistence/object-id';
import { getSession } from '../../database/mongoose-transaction-manager';
import type { UserDocument } from '../../database/models/user.model';
import type { CreateUserInput, IUserRepository, User, UserWithSecret } from './user.interface';

/** The only place the users collection is touched (CLAUDE.md §6). */
export class UserRepository implements IUserRepository {
  constructor(private readonly model: Model<UserDocument>) {}

  async findById(id: string): Promise<User | null> {
    const objectId = toObjectIdOrNull(id);
    if (objectId === null) {
      return null;
    }

    const document = await this.model.findById(objectId).lean<UserDocument | null>().exec();
    return document === null ? null : UserRepository.toDomain(document);
  }

  async findManyByIds(ids: readonly string[]): Promise<User[]> {
    const objectIds = ids
      .map((id) => toObjectIdOrNull(id))
      .filter((id): id is NonNullable<typeof id> => id !== null);

    if (objectIds.length === 0) {
      return [];
    }

    const documents = await this.model
      .find({ _id: { $in: objectIds } })
      .lean<UserDocument[]>()
      .exec();

    return documents.map((document) => UserRepository.toDomain(document));
  }

  async findByEmail(email: string): Promise<UserWithSecret | null> {
    const document = await this.model
      .findOne({ email: email.toLowerCase() })
      .lean<UserDocument | null>()
      .exec();

    if (document === null) {
      return null;
    }

    return { ...UserRepository.toDomain(document), passwordHash: document.passwordHash };
  }

  async existsByEmail(email: string): Promise<boolean> {
    const found = await this.model.exists({ email: email.toLowerCase() }).exec();
    return found !== null;
  }

  async create(input: CreateUserInput, context?: TransactionContext): Promise<User> {
    const session = getSession(context);
    const [created] = await this.model.create([{ ...input, isActive: true }], { session });

    if (created === undefined) {
      throw new Error('User insert returned no document');
    }

    return UserRepository.toDomain(created.toObject<UserDocument>());
  }

  async markLoggedIn(id: string, loggedInAt: Date): Promise<void> {
    const objectId = toObjectIdOrNull(id);
    if (objectId === null) {
      return;
    }
    await this.model.updateOne({ _id: objectId }, { $set: { lastLoginAt: loggedInAt } }).exec();
  }

  /** Document → domain. Driver types never escape this class. */
  private static toDomain(document: UserDocument): User {
    return {
      id: toIdString(document._id),
      email: document.email,
      role: document.role,
      isActive: document.isActive,
      lastLoginAt: document.lastLoginAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
