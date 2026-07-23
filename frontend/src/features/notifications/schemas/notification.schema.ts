import { z } from 'zod';

import { paginationSchema } from '@/features/jobs/schemas/job.schema';

export const NOTIFICATION_TYPE_VALUES = ['application_status_changed'] as const;
export const NOTIFICATION_RESOURCE_KINDS = ['application', 'job'] as const;

export const notificationSchema = z.object({
  id: z.string(),
  type: z.enum(NOTIFICATION_TYPE_VALUES),
  title: z.string(),
  body: z.string(),
  resourceKind: z.enum(NOTIFICATION_RESOURCE_KINDS),
  resourceId: z.string(),
  isRead: z.boolean(),
  readAt: z.string().optional(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof notificationSchema>;

export const notificationListSchema = z.object({
  notifications: z.array(notificationSchema),
  unreadCount: z.number(),
  pagination: paginationSchema,
});
export type NotificationList = z.infer<typeof notificationListSchema>;

export const markReadResultSchema = z.object({ markedCount: z.number() });
