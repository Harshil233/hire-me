import { Router, type RequestHandler } from 'express';

import type { NotificationController } from './notification.controller';
import { validateMarkRead, validateNotificationQuery } from './notification.validator';

export interface NotificationRoutesDependencies {
  readonly controller: NotificationController;
  readonly authenticate: RequestHandler;
}

/**
 * Both routes are scoped to the signed-in user inside the service, so neither needs a
 * role guard: everyone has their own notifications and can only ever see those.
 */
export const createNotificationRouter = ({
  controller,
  authenticate,
}: NotificationRoutesDependencies): Router => {
  const router = Router();

  router.get('/', authenticate, validateNotificationQuery, controller.list);
  router.patch('/read', authenticate, validateMarkRead, controller.markRead);

  return router;
};
