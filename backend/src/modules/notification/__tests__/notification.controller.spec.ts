import { describe, expect, it, vi } from 'vitest';

import { ROLES } from '../../../config/constants';
import { createMockRequest, createMockResponse } from '../../../../tests/helpers/express-mocks';
import { NotificationController } from '../notification.controller';
import type { INotificationService, Notification } from '../notification.interface';

const NOW = new Date('2026-03-10T10:00:00.000Z');
const AUTH = { userId: 'candidate-1', role: ROLES.CANDIDATE };

const NOTIFICATION: Notification = {
  id: 'notification-1',
  userId: 'candidate-1',
  type: 'application_status_changed',
  title: 'Your application is now shortlisted',
  body: 'Senior Backend Engineer — shortlisted.',
  resourceKind: 'application',
  resourceId: 'application-1',
  isRead: false,
  createdAt: NOW,
  updatedAt: NOW,
};

const createController = (): {
  controller: NotificationController;
  service: INotificationService;
} => {
  const service: INotificationService = {
    notify: vi.fn(async () => NOTIFICATION),
    list: vi.fn(async () => ({
      notifications: [NOTIFICATION],
      unreadCount: 1,
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    })),
    markRead: vi.fn(async () => 1),
  };

  return { controller: new NotificationController(service), service };
};

describe('NotificationController.list', () => {
  it('returns notifications, the unread count and pagination', async () => {
    const { controller } = createController();
    const res = createMockResponse();

    await controller.list(createMockRequest({ auth: AUTH, query: {} }), res);

    expect(res.capturedBody).toMatchObject({
      success: true,
      data: {
        notifications: [{ id: 'notification-1', isRead: false }],
        unreadCount: 1,
      },
    });
  });

  it('never puts the owning user id on the wire', async () => {
    const { controller } = createController();
    const res = createMockResponse();

    await controller.list(createMockRequest({ auth: AUTH }), res);

    const body = res.capturedBody as { data: { notifications: object[] } };
    expect(body.data.notifications[0]).not.toHaveProperty('userId');
  });

  it('scopes the read to the signed-in user', async () => {
    const { controller, service } = createController();

    await controller.list(createMockRequest({ auth: AUTH, query: {} }), createMockResponse());

    expect(service.list).toHaveBeenCalledWith('candidate-1', {});
  });

  it('refuses without an authenticated identity', async () => {
    const { controller } = createController();

    await expect(
      controller.list(createMockRequest(), createMockResponse()),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe('NotificationController.markRead', () => {
  it('marks one notification read', async () => {
    const { controller, service } = createController();
    const res = createMockResponse();

    await controller.markRead(
      createMockRequest({ auth: AUTH, body: { id: 'notification-1' } }),
      res,
    );

    expect(service.markRead).toHaveBeenCalledWith('candidate-1', 'notification-1');
    expect(res.capturedBody).toEqual({ success: true, data: { markedCount: 1 } });
  });

  it('marks everything read when no id is sent', async () => {
    const { controller, service } = createController();

    await controller.markRead(createMockRequest({ auth: AUTH, body: {} }), createMockResponse());

    expect(service.markRead).toHaveBeenCalledWith('candidate-1', undefined);
  });

  it('takes the owner from the token, never the body', async () => {
    const { controller, service } = createController();

    await controller.markRead(
      createMockRequest({ auth: AUTH, body: { userId: 'someone-else' } }),
      createMockResponse(),
    );

    expect(service.markRead).toHaveBeenCalledWith('candidate-1', undefined);
  });
});
