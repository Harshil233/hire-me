import { describe, expect, it, vi } from 'vitest';

import { ROLES } from '../../../config/constants';
import { UnauthorizedError } from '../../errors/app-error';
import type { IOwnedResourceService, OwnedEntity } from '../../persistence/owned-resource.types';
import { createMockRequest, createMockResponse } from '../../../../tests/helpers/express-mocks';
import { OwnedResourceController } from '../owned-resource.controller';

interface Widget extends OwnedEntity {
  readonly title: string;
}

const WIDGET: Widget = {
  id: 'widget-1',
  userId: 'user-1',
  title: 'A widget',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

const AUTH = { userId: 'user-1', role: ROLES.CANDIDATE };
const present = (widget: Widget): { id: string; title: string } => ({
  id: widget.id,
  title: widget.title,
});

const createHarness = (): {
  controller: OwnedResourceController<Widget, { title: string }, { id: string; title: string }>;
  service: IOwnedResourceService<Widget, { title: string }>;
} => {
  const service: IOwnedResourceService<Widget, { title: string }> = {
    list: vi.fn(async () => [WIDGET]),
    get: vi.fn(async () => WIDGET),
    create: vi.fn(async () => WIDGET),
    update: vi.fn(async () => WIDGET),
    remove: vi.fn(async () => undefined),
    countByUser: vi.fn(async () => 1),
  };

  return {
    controller: new OwnedResourceController(service, present, {
      plural: 'widgets',
      singular: 'widget',
    }),
    service,
  };
};

describe('OwnedResourceController', () => {
  it('lists the caller’s records under the plural key', async () => {
    const { controller, service } = createHarness();
    const res = createMockResponse();

    await controller.list(createMockRequest({ auth: AUTH }), res);

    expect(service.list).toHaveBeenCalledWith('user-1');
    expect(res.capturedBody).toEqual({
      success: true,
      data: { widgets: [{ id: 'widget-1', title: 'A widget' }] },
    });
  });

  it('creates and answers 201 under the singular key', async () => {
    const { controller, service } = createHarness();
    const res = createMockResponse();

    await controller.create(createMockRequest({ auth: AUTH, body: { title: 'New' } }), res);

    expect(service.create).toHaveBeenCalledWith('user-1', { title: 'New' });
    expect(res.capturedStatus).toBe(201);
    expect(res.capturedBody).toEqual({
      success: true,
      data: { widget: { id: 'widget-1', title: 'A widget' } },
    });
  });

  it('updates the record identified in the path, scoped to the caller', async () => {
    const { controller, service } = createHarness();
    const res = createMockResponse();

    await controller.update(
      createMockRequest({ auth: AUTH, params: { id: 'widget-1' }, body: { title: 'Renamed' } }),
      res,
    );

    expect(service.update).toHaveBeenCalledWith('widget-1', 'user-1', { title: 'Renamed' });
    expect(res.capturedStatus).toBe(200);
  });

  it('answers 204 on delete', async () => {
    const { controller, service } = createHarness();
    const res = createMockResponse();

    await controller.remove(createMockRequest({ auth: AUTH, params: { id: 'widget-1' } }), res);

    expect(service.remove).toHaveBeenCalledWith('widget-1', 'user-1');
    expect(res.capturedStatus).toBe(204);
  });

  it.each([
    ['list', (c: OwnedResourceController<Widget, { title: string }, unknown>) => c.list],
    ['create', (c: OwnedResourceController<Widget, { title: string }, unknown>) => c.create],
    ['update', (c: OwnedResourceController<Widget, { title: string }, unknown>) => c.update],
    ['remove', (c: OwnedResourceController<Widget, { title: string }, unknown>) => c.remove],
  ])('refuses %s without an authenticated identity', async (_name, pick) => {
    const { controller } = createHarness();
    const handler = pick(controller) as (req: unknown, res: unknown) => Promise<void>;

    await expect(
      handler(createMockRequest({ params: { id: 'widget-1' } }), createMockResponse()),
    ).rejects.toThrow(UnauthorizedError);
  });
});
