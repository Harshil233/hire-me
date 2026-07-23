import type { AxiosInstance } from 'axios';

import { httpClient, request } from '@/services/api-client';
import {
  markReadResultSchema,
  notificationListSchema,
  type NotificationList,
} from '../schemas/notification.schema';

export interface INotificationApi {
  list(): Promise<NotificationList>;
  /** Omitting the id marks every unread notification read. */
  markRead(id?: string): Promise<number>;
}

export const createNotificationApi = (
  client: AxiosInstance = httpClient,
): INotificationApi => ({
  list: () => request(client, { url: '/notifications', method: 'GET' }, notificationListSchema),

  markRead: async (id) =>
    (
      await request(
        client,
        { url: '/notifications/read', method: 'PATCH', data: id === undefined ? {} : { id } },
        markReadResultSchema,
      )
    ).markedCount,
});

export const notificationApi: INotificationApi = createNotificationApi();
