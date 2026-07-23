import { z } from 'zod';

import {
  NOTIFICATION_RESOURCE_KINDS,
  NOTIFICATION_TYPE_VALUES,
  PAGINATION,
} from '../../config/constants';
import { objectIdSchema, optionalField } from '../../common/validation/fields';

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(PAGINATION.DEFAULT_PAGE),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(PAGINATION.MAX_PAGE_SIZE, `Page size cannot exceed ${PAGINATION.MAX_PAGE_SIZE}`)
    .default(PAGINATION.DEFAULT_PAGE_SIZE),
});
export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;

/** An absent id means "mark everything read". */
export const markReadSchema = z.object({ id: optionalField(objectIdSchema) });
export type MarkReadInput = z.infer<typeof markReadSchema>;

export const notificationResponseSchema = z.object({
  id: z.string(),
  type: z.enum(NOTIFICATION_TYPE_VALUES),
  title: z.string(),
  body: z.string(),
  resourceKind: z.enum(NOTIFICATION_RESOURCE_KINDS),
  resourceId: z.string(),
  isRead: z.boolean(),
  readAt: z.iso.datetime().optional(),
  createdAt: z.iso.datetime(),
});
export type NotificationResponse = z.infer<typeof notificationResponseSchema>;
