import type { Model } from 'mongoose';

import { toIdString, toObjectId, toObjectIdOrNull } from '../../common/persistence/object-id';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import { getSession } from '../../database/mongoose-transaction-manager';
import type { RefreshTokenDocument } from '../../database/models/refresh-token.model';
import type {
  CreateRefreshTokenData,
  IRefreshTokenRepository,
  StoredRefreshToken,
} from './auth.interface';

/** The only place the refresh-token collection is touched. */
export class RefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly model: Model<RefreshTokenDocument>) {}

  async create(data: CreateRefreshTokenData, context?: TransactionContext): Promise<void> {
    const session = getSession(context);
    await this.model.create([{ ...data, userId: toObjectId(data.userId) }], { session });
  }

  async findByTokenHash(tokenHash: string): Promise<StoredRefreshToken | null> {
    const document = await this.model
      .findOne({ tokenHash })
      .lean<RefreshTokenDocument | null>()
      .exec();

    return document === null ? null : RefreshTokenRepository.toDomain(document);
  }

  async revokeById(id: string, revokedAt: Date): Promise<void> {
    const objectId = toObjectIdOrNull(id);
    if (objectId === null) {
      return;
    }
    await this.model
      .updateOne({ _id: objectId, revokedAt: { $exists: false } }, { $set: { revokedAt } })
      .exec();
  }

  async revokeFamily(family: string, revokedAt: Date): Promise<void> {
    await this.model
      .updateMany({ family, revokedAt: { $exists: false } }, { $set: { revokedAt } })
      .exec();
  }

  private static toDomain(document: RefreshTokenDocument): StoredRefreshToken {
    return {
      id: toIdString(document._id),
      userId: toIdString(document.userId),
      jti: document.jti,
      family: document.family,
      expiresAt: document.expiresAt,
      revokedAt: document.revokedAt,
    };
  }
}
