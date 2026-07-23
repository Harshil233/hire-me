import type { Model } from 'mongoose';

import type { Page } from '../../common/persistence/page';
import { toIdString, toObjectId, toObjectIdOrNull } from '../../common/persistence/object-id';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import { getSession } from '../../database/mongoose-transaction-manager';
import type { NotificationDocument } from '../../database/models/notification.model';
import type {
  CreateNotificationData,
  INotificationRepository,
  Notification,
} from './notification.interface';

/** The only place the notifications collection is touched (CLAUDE.md §6). */
export class NotificationRepository implements INotificationRepository {
  constructor(private readonly model: Model<NotificationDocument>) {}

  async listForUser(
    userId: string,
    page: number,
    pageSize: number,
  ): Promise<Page<Notification>> {
    const objectId = toObjectIdOrNull(userId);
    if (objectId === null) {
      return { items: [], total: 0 };
    }

    const [documents, total] = await Promise.all([
      this.model
        .find({ userId: objectId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean<NotificationDocument[]>()
        .exec(),
      this.model.countDocuments({ userId: objectId }).exec(),
    ]);

    return {
      items: documents.map((document) => NotificationRepository.toDomain(document)),
      total,
    };
  }

  async countUnread(userId: string): Promise<number> {
    const objectId = toObjectIdOrNull(userId);
    if (objectId === null) {
      return 0;
    }

    return this.model.countDocuments({ userId: objectId, isRead: false }).exec();
  }

  async create(
    data: CreateNotificationData,
    context?: TransactionContext,
  ): Promise<Notification> {
    const session = getSession(context);

    const [created] = await this.model.create(
      [
        {
          userId: toObjectId(data.userId),
          type: data.type,
          title: data.title,
          body: data.body,
          resourceKind: data.resourceKind,
          resourceId: toObjectId(data.resourceId),
          isRead: false,
        },
      ],
      { session },
    );

    if (created === undefined) {
      throw new Error('Notification insert returned no document');
    }

    return NotificationRepository.toDomain(created.toObject<NotificationDocument>());
  }

  async markRead(userId: string, at: Date, id?: string): Promise<number> {
    const objectId = toObjectIdOrNull(userId);
    if (objectId === null) {
      return 0;
    }

    // Always scoped to the caller, so an id belonging to someone else matches nothing.
    const filter: Record<string, unknown> = { userId: objectId, isRead: false };

    if (id !== undefined) {
      const notificationId = toObjectIdOrNull(id);
      if (notificationId === null) {
        return 0;
      }
      filter._id = notificationId;
    }

    const result = await this.model
      .updateMany(filter, { $set: { isRead: true, readAt: at } })
      .exec();

    return result.modifiedCount;
  }

  private static toDomain(document: NotificationDocument): Notification {
    return {
      id: toIdString(document._id),
      userId: toIdString(document.userId),
      type: document.type,
      title: document.title,
      body: document.body,
      resourceKind: document.resourceKind,
      resourceId: toIdString(document.resourceId),
      isRead: document.isRead,
      readAt: document.readAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
