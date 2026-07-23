import type { Request, Response } from 'express';

import { requireAuth } from '../../common/middlewares/authorize.middleware';
import { validatedQuery } from '../../common/middlewares/validate.middleware';
import { sendSuccess } from '../../common/http/api-response';
import type { INotificationService } from './notification.interface';
import { toNotificationResponse } from './notification.mapper';
import type { MarkReadInput, NotificationQueryInput } from './notification.schema';

/** Translates HTTP ↔ service calls only; no business rules live here. */
export class NotificationController {
  constructor(private readonly notificationService: INotificationService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const { userId } = requireAuth(req);
    const query = validatedQuery<NotificationQueryInput>(req);
    const result = await this.notificationService.list(userId, query);

    sendSuccess(res, {
      notifications: result.notifications.map((notification) =>
        toNotificationResponse(notification),
      ),
      unreadCount: result.unreadCount,
      pagination: result.pagination,
    });
  };

  markRead = async (
    req: Request<Record<string, never>, unknown, MarkReadInput>,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    const markedCount = await this.notificationService.markRead(userId, req.body.id);

    sendSuccess(res, { markedCount });
  };
}
