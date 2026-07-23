import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { httpClient } from '@/services/api-client';
import { renderWithProviders } from '@/test/render';
import { NotificationBell } from '../components/NotificationBell';
import type { Notification } from '../schemas/notification.schema';

let mock: MockAdapter;

const notification = (overrides: Partial<Notification> = {}): Notification => ({
  id: 'notification-1',
  type: 'application_status_changed',
  title: 'Your application is now shortlisted',
  body: 'Senior Backend Engineer — your application has been marked shortlisted.',
  resourceKind: 'application',
  resourceId: 'application-1',
  isRead: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const inbox = (
  notifications: Notification[],
  unreadCount = notifications.filter((entry) => !entry.isRead).length,
): Record<string, unknown> => ({
  success: true,
  data: {
    notifications,
    unreadCount,
    pagination: {
      page: 1,
      pageSize: 20,
      total: notifications.length,
      totalPages: 1,
    },
  },
});

beforeEach(() => {
  mock = new MockAdapter(httpClient);
});

afterEach(() => {
  mock.restore();
});

describe('NotificationBell', () => {
  it('fetches the inbox on mount — no polling involved', async () => {
    mock.onGet('/notifications').reply(200, inbox([notification()]));

    renderWithProviders(<NotificationBell />);

    await waitFor(() => {
      expect(mock.history.get).toHaveLength(1);
    });
  });

  it('shows the unread count on the bell', async () => {
    mock.onGet('/notifications').reply(200, inbox([notification()], 3));

    renderWithProviders(<NotificationBell />);

    expect(await screen.findByTestId('notification-badge')).toHaveTextContent('3');
    expect(screen.getByRole('button', { name: 'Notifications, 3 unread' })).toBeInTheDocument();
  });

  it('caps a large unread count', async () => {
    mock.onGet('/notifications').reply(200, inbox([notification()], 42));

    renderWithProviders(<NotificationBell />);

    expect(await screen.findByTestId('notification-badge')).toHaveTextContent('9+');
  });

  it('shows no badge when everything is read', async () => {
    mock.onGet('/notifications').reply(200, inbox([notification({ isRead: true })], 0));

    renderWithProviders(<NotificationBell />);

    await waitFor(() => {
      expect(mock.history.get).toHaveLength(1);
    });
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
  });

  it('opens the panel and lists the notifications', async () => {
    mock.onGet('/notifications').reply(200, inbox([notification()]));

    renderWithProviders(<NotificationBell />);
    await userEvent.click(await screen.findByRole('button', { name: /Notifications/ }));

    expect(screen.getByRole('menu', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.getByText('Your application is now shortlisted')).toBeInTheDocument();
  });

  it('tells the user when the inbox is empty', async () => {
    mock.onGet('/notifications').reply(200, inbox([]));

    renderWithProviders(<NotificationBell />);
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }));

    expect(screen.getByText(/Nothing here yet/)).toBeInTheDocument();
  });

  it('marks a single notification read when it is clicked', async () => {
    mock.onGet('/notifications').reply(200, inbox([notification()]));
    mock.onPatch('/notifications/read').reply(200, { success: true, data: { markedCount: 1 } });

    renderWithProviders(<NotificationBell />);
    await userEvent.click(await screen.findByRole('button', { name: /Notifications/ }));
    await userEvent.click(screen.getByText('Your application is now shortlisted'));

    await waitFor(() => {
      expect(JSON.parse(mock.history.patch[0]?.data as string)).toEqual({
        id: 'notification-1',
      });
    });
  });

  it('does not re-mark one that is already read', async () => {
    mock.onGet('/notifications').reply(200, inbox([notification({ isRead: true })], 0));

    renderWithProviders(<NotificationBell />);
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }));
    await userEvent.click(screen.getByText('Your application is now shortlisted'));

    expect(mock.history.patch).toHaveLength(0);
  });

  it('marks everything read from the panel header', async () => {
    mock.onGet('/notifications').reply(200, inbox([notification()]));
    mock.onPatch('/notifications/read').reply(200, { success: true, data: { markedCount: 1 } });

    renderWithProviders(<NotificationBell />);
    await userEvent.click(await screen.findByRole('button', { name: /Notifications/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Mark all read' }));

    await waitFor(() => {
      expect(JSON.parse(mock.history.patch[0]?.data as string)).toEqual({});
    });
  });

  it('offers no "mark all" when there is nothing unread', async () => {
    mock.onGet('/notifications').reply(200, inbox([notification({ isRead: true })], 0));

    renderWithProviders(<NotificationBell />);
    await userEvent.click(await screen.findByRole('button', { name: 'Notifications' }));

    expect(screen.queryByRole('button', { name: 'Mark all read' })).not.toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    mock.onGet('/notifications').reply(200, inbox([notification()]));

    renderWithProviders(<NotificationBell />);
    await userEvent.click(await screen.findByRole('button', { name: /Notifications/ }));
    expect(screen.getByRole('menu', { name: 'Notifications' })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('menu', { name: 'Notifications' })).not.toBeInTheDocument();
    });
  });

  it('closes when the pointer goes outside it', async () => {
    mock.onGet('/notifications').reply(200, inbox([notification()]));

    renderWithProviders(
      <div>
        <NotificationBell />
        <button type="button">Elsewhere</button>
      </div>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /Notifications/ }));

    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));

    await waitFor(() => {
      expect(screen.queryByRole('menu', { name: 'Notifications' })).not.toBeInTheDocument();
    });
  });

  it('makes no request while disabled', () => {
    mock.onGet('/notifications').reply(200, inbox([]));

    renderWithProviders(<NotificationBell isEnabled={false} />);

    expect(mock.history.get).toHaveLength(0);
  });
});
