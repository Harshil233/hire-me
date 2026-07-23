import type { RequestHandler } from 'express';

import { validateRequest } from '../../common/middlewares/validate.middleware';
import { markReadSchema, notificationQuerySchema } from './notification.schema';

export const validateNotificationQuery: RequestHandler = validateRequest({
  query: notificationQuerySchema,
});

export const validateMarkRead: RequestHandler = validateRequest({ body: markReadSchema });
