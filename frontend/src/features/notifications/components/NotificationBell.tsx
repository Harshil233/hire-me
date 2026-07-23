import { useEffect, useRef, useState } from 'react';

import { BellIcon } from '@/components/icons';
import { useMarkNotificationsRead, useNotifications } from '../hooks/useNotifications';
import { NotificationItem } from './NotificationItem';

export interface NotificationBellProps {
  /** Skipped while the session is still settling, so no request fires signed out. */
  readonly isEnabled?: boolean;
}

export const NotificationBell = ({
  isEnabled = true,
}: NotificationBellProps): React.JSX.Element => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = useNotifications(undefined, isEnabled);
  const markRead = useMarkNotificationsRead();

  const unreadCount = query.data?.unreadCount ?? 0;
  const notifications = query.data?.notifications ?? [];

  // Close on an outside click or Escape, the way a menu is expected to behave.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent): void => {
      if (containerRef.current !== null && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => {
          setIsOpen((open) => !open);
        }}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-fg-muted transition hover:border-border-strong hover:bg-surface-hover hover:text-fg"
      >
        <BellIcon className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-danger px-1 text-[0.625rem] font-semibold text-fg-on-brand"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-raised shadow-[var(--shadow-lg)] sm:w-96"
        >
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-fg">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  markRead.mutate(undefined);
                }}
                className="text-xs font-medium text-brand-text transition hover:underline"
              >
                Mark all read
              </button>
            )}
          </header>

          <div className="max-h-96 overflow-y-auto">
            {query.isPending && (
              <p className="px-4 py-8 text-center text-sm text-fg-muted">Loading…</p>
            )}

            {query.isSuccess && notifications.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-fg-muted">
                Nothing here yet. Updates on your applications will show up in this list.
              </p>
            )}

            <ul>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={(id) => {
                    markRead.mutate(id);
                  }}
                />
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
