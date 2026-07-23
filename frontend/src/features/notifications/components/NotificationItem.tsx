import { formatRelativeTime } from '@/lib/format';
import type { Notification } from '../schemas/notification.schema';

export interface NotificationItemProps {
  readonly notification: Notification;
  readonly onRead: (id: string) => void;
}

/** One row of the bell panel. Clicking an unread entry marks it read. */
export const NotificationItem = ({
  notification,
  onRead,
}: NotificationItemProps): React.JSX.Element => (
  <li>
    <button
      type="button"
      onClick={() => {
        if (!notification.isRead) {
          onRead(notification.id);
        }
      }}
      className="flex w-full gap-3 border-b border-border px-4 py-3 text-left transition last:border-b-0 hover:bg-surface-hover"
    >
      <span
        aria-hidden="true"
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
          notification.isRead ? 'bg-transparent' : 'bg-brand'
        }`}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{notification.title}</span>
        <span className="mt-0.5 block text-sm text-fg-muted">{notification.body}</span>
        <span className="mt-1 block text-xs text-fg-subtle">
          {formatRelativeTime(notification.createdAt)}
        </span>
      </span>
    </button>
  </li>
);
