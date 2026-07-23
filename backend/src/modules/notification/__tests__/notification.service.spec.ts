import { describe, expect, it, vi } from 'vitest';

import { PAGINATION } from '../../../config/constants';
import type { TransactionContext } from '../../../common/persistence/transaction.types';
import { NotificationService } from '../notification.service';
import type { INotificationRepository, Notification } from '../notification.interface';

const NOW = new Date('2026-03-10T10:00:00.000Z');

const NOTIFICATION: Notification = {
  id: 'notification-1',
  userId: 'candidate-1',
  type: 'application_status_changed',
  title: 'Your application is now shortlisted',
  body: 'Senior Backend Engineer — your application has been marked shortlisted.',
  resourceKind: 'application',
  resourceId: 'application-1',
  isRead: false,
  createdAt: NOW,
  updatedAt: NOW,
};

const QUERY = { page: PAGINATION.DEFAULT_PAGE, pageSize: PAGINATION.DEFAULT_PAGE_SIZE };

const createHarness = (): {
  service: NotificationService;
  repository: INotificationRepository;
} => {
  const repository: INotificationRepository = {
    listForUser: vi.fn(async () => ({ items: [NOTIFICATION], total: 1 })),
    countUnread: vi.fn(async () => 3),
    create: vi.fn(async () => NOTIFICATION),
    markRead: vi.fn(async () => 2),
  };

  return { service: new NotificationService(repository, () => NOW), repository };
};

describe('NotificationService.notify', () => {
  it('records the notification', async () => {
    const { service, repository } = createHarness();

    await service.notify({
      userId: 'candidate-1',
      type: 'application_status_changed',
      title: 'Shortlisted',
      body: 'You have been shortlisted.',
      resourceKind: 'application',
      resourceId: 'application-1',
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'candidate-1' }),
      undefined,
    );
  });

  it('passes a transaction context through so it commits with its cause', async () => {
    const { service, repository } = createHarness();
    const context: TransactionContext = { transactionId: 'txn-1' };

    await service.notify(
      {
        userId: 'candidate-1',
        type: 'application_status_changed',
        title: 'Shortlisted',
        body: 'You have been shortlisted.',
        resourceKind: 'application',
        resourceId: 'application-1',
      },
      context,
    );

    expect(repository.create).toHaveBeenCalledWith(expect.anything(), context);
  });
});

describe('NotificationService.list', () => {
  it('returns the page, the unread count and the pagination block', async () => {
    const { service } = createHarness();

    const result = await service.list('candidate-1', QUERY);

    expect(result.notifications).toHaveLength(1);
    expect(result.unreadCount).toBe(3);
    expect(result.pagination).toEqual({
      page: PAGINATION.DEFAULT_PAGE,
      pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
      total: 1,
      totalPages: 1,
    });
  });

  it('scopes both reads to the calling user', async () => {
    const { service, repository } = createHarness();

    await service.list('candidate-1', QUERY);

    expect(repository.listForUser).toHaveBeenCalledWith(
      'candidate-1',
      PAGINATION.DEFAULT_PAGE,
      PAGINATION.DEFAULT_PAGE_SIZE,
    );
    expect(repository.countUnread).toHaveBeenCalledWith('candidate-1');
  });

  it('reports one page for an empty inbox', async () => {
    const { service, repository } = createHarness();
    vi.mocked(repository.listForUser).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(repository.countUnread).mockResolvedValue(0);

    const result = await service.list('candidate-1', QUERY);

    expect(result.notifications).toEqual([]);
    expect(result.pagination.totalPages).toBe(1);
  });
});

describe('NotificationService.markRead', () => {
  it('marks a single notification read with the injected clock', async () => {
    const { service, repository } = createHarness();

    const marked = await service.markRead('candidate-1', 'notification-1');

    expect(repository.markRead).toHaveBeenCalledWith('candidate-1', NOW, 'notification-1');
    expect(marked).toBe(2);
  });

  it('marks everything read when no id is given', async () => {
    const { service, repository } = createHarness();

    await service.markRead('candidate-1');

    expect(repository.markRead).toHaveBeenCalledWith('candidate-1', NOW, undefined);
  });
});
