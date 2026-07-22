import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '../../errors/error-codes';
import { NotFoundError } from '../../errors/app-error';
import { OwnedResourceService } from '../owned-resource.service';
import type { IOwnedResourceRepository, OwnedEntity } from '../owned-resource.types';

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

const createRepository = (): IOwnedResourceRepository<Widget, { title: string }> => ({
  listByUser: vi.fn(async () => [WIDGET]),
  findByIdForUser: vi.fn(async () => WIDGET),
  create: vi.fn(async () => WIDGET),
  update: vi.fn(async () => WIDGET),
  deleteForUser: vi.fn(async () => true),
  countByUser: vi.fn(async () => 1),
});

describe('OwnedResourceService', () => {
  let repository: IOwnedResourceRepository<Widget, { title: string }>;
  let service: OwnedResourceService<Widget, { title: string }>;

  beforeEach(() => {
    repository = createRepository();
    service = new OwnedResourceService(repository, 'Widget');
  });

  it('lists the caller’s records only', async () => {
    await expect(service.list('user-1')).resolves.toEqual([WIDGET]);
    expect(repository.listByUser).toHaveBeenCalledWith('user-1');
  });

  it('fetches a record scoped to its owner', async () => {
    await expect(service.get('widget-1', 'user-1')).resolves.toEqual(WIDGET);
    expect(repository.findByIdForUser).toHaveBeenCalledWith('widget-1', 'user-1');
  });

  it('creates against the caller', async () => {
    await service.create('user-1', { title: 'New' });

    expect(repository.create).toHaveBeenCalledWith('user-1', { title: 'New' });
  });

  it('updates against the caller', async () => {
    await service.update('widget-1', 'user-1', { title: 'Renamed' });

    expect(repository.update).toHaveBeenCalledWith('widget-1', 'user-1', { title: 'Renamed' });
  });

  it('removes against the caller', async () => {
    await expect(service.remove('widget-1', 'user-1')).resolves.toBeUndefined();
  });

  it('counts for the completion calculators', async () => {
    await expect(service.countByUser('user-1')).resolves.toBe(1);
  });

  it('reports another user’s record as not found, never as forbidden', async () => {
    vi.mocked(repository.findByIdForUser).mockResolvedValue(null);

    await expect(service.get('widget-1', 'intruder')).rejects.toMatchObject({
      statusCode: 404,
      code: ERROR_CODES.RESOURCE_NOT_FOUND,
      message: 'Widget not found',
    });
  });

  it('throws when updating a record that is not the caller’s', async () => {
    vi.mocked(repository.update).mockResolvedValue(null);

    await expect(service.update('widget-1', 'intruder', { title: 'x' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('throws when deleting a record that is not the caller’s', async () => {
    vi.mocked(repository.deleteForUser).mockResolvedValue(false);

    await expect(service.remove('widget-1', 'intruder')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('propagates repository failures untouched', async () => {
    vi.mocked(repository.listByUser).mockRejectedValue(new Error('database is down'));

    await expect(service.list('user-1')).rejects.toThrow('database is down');
  });
});
