import type { Notification } from './notification.interface';
import type { NotificationResponse } from './notification.schema';

/** Domain → HTTP response. `userId` never goes out: the list is already the caller's. */
export const toNotificationResponse = (notification: Notification): NotificationResponse => ({
  id: notification.id,
  type: notification.type,
  title: notification.title,
  body: notification.body,
  resourceKind: notification.resourceKind,
  resourceId: notification.resourceId,
  isRead: notification.isRead,
  readAt: notification.readAt?.toISOString(),
  createdAt: notification.createdAt.toISOString(),
});
