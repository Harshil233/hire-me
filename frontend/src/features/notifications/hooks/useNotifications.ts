import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { ApiError } from '@/services/api-error';
import { notificationApi, type INotificationApi } from '../api/notification.api';
import type { NotificationList } from '../schemas/notification.schema';

/**
 * Reads the inbox when the shell mounts — that is, on load and on every reload.
 * Deliberately no `refetchInterval`: notifications are durable rows, not a live feed,
 * so nothing polls in the background.
 */
export const useNotifications = (
  api: INotificationApi = notificationApi,
  isEnabled = true,
): UseQueryResult<NotificationList, ApiError> =>
  useQuery<NotificationList, ApiError>({
    queryKey: QUERY_KEYS.notifications,
    queryFn: () => api.list(),
    enabled: isEnabled,
  });

export const useMarkNotificationsRead = (
  api: INotificationApi = notificationApi,
): UseMutationResult<number, ApiError, string | undefined> => {
  const queryClient = useQueryClient();

  return useMutation<number, ApiError, string | undefined>({
    mutationFn: (id) => api.markRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
    },
  });
};
