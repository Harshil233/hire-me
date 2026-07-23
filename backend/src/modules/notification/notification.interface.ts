import type { NotificationResourceKind, NotificationType } from '../../config/constants';
import type { PaginationMeta } from '../../common/http/api-response';
import type { Page } from '../../common/persistence/page';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import { createToken, type Token } from '../../container/token';
import type { NotificationQueryInput } from './notification.schema';

export interface Notification {
  readonly id: string;
  readonly userId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly resourceKind: NotificationResourceKind;
  readonly resourceId: string;
  readonly isRead: boolean;
  readonly readAt?: Date | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateNotificationData {
  readonly userId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly resourceKind: NotificationResourceKind;
  readonly resourceId: string;
}

export interface INotificationRepository {
  listForUser(userId: string, page: number, pageSize: number): Promise<Page<Notification>>;
  countUnread(userId: string): Promise<number>;
  create(data: CreateNotificationData, context?: TransactionContext): Promise<Notification>;
  /** Marks one notification read, or every unread one when no id is given. */
  markRead(userId: string, at: Date, id?: string): Promise<number>;
}

export interface NotificationListResult {
  readonly notifications: readonly Notification[];
  readonly unreadCount: number;
  readonly pagination: PaginationMeta;
}

export interface INotificationService {
  /**
   * Records a notification. Takes an optional transaction context so the event that
   * caused it and the notification itself commit together or not at all.
   */
  notify(data: CreateNotificationData, context?: TransactionContext): Promise<Notification>;
  list(userId: string, query: NotificationQueryInput): Promise<NotificationListResult>;
  markRead(userId: string, id?: string): Promise<number>;
}

export const NOTIFICATION_REPOSITORY: Token<INotificationRepository> = createToken(
  'INotificationRepository',
);
export const NOTIFICATION_SERVICE: Token<INotificationService> =
  createToken('INotificationService');
