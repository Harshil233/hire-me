import type { Request, Response } from 'express';

import { requireAuth } from '../middlewares/authorize.middleware';
import type { IOwnedResourceService, OwnedEntity } from '../persistence/owned-resource.types';
import { HTTP_STATUS, sendNoContent, sendSuccess } from './api-response';

export interface ResourceIdParams extends Record<string, string> {
  id: string;
}

export interface OwnedResourceKeys {
  /** Envelope key for a collection, e.g. `experiences`. */
  readonly plural: string;
  /** Envelope key for a single record, e.g. `experience`. */
  readonly singular: string;
}

/**
 * HTTP translation for every user-owned section. Instantiated once per module with a
 * presenter, so no module repeats list/create/update/delete handlers.
 */
export class OwnedResourceController<TEntity extends OwnedEntity, TInput, TResponse> {
  constructor(
    private readonly service: IOwnedResourceService<TEntity, TInput>,
    private readonly present: (entity: TEntity) => TResponse,
    private readonly keys: OwnedResourceKeys,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const { userId } = requireAuth(req);
    const entities = await this.service.list(userId);
    sendSuccess(res, { [this.keys.plural]: entities.map((entity) => this.present(entity)) });
  };

  create = async (
    req: Request<Record<string, never>, unknown, TInput>,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    const created = await this.service.create(userId, req.body);
    sendSuccess(res, { [this.keys.singular]: this.present(created) }, HTTP_STATUS.CREATED);
  };

  update = async (
    req: Request<ResourceIdParams, unknown, TInput>,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    const updated = await this.service.update(req.params.id, userId, req.body);
    sendSuccess(res, { [this.keys.singular]: this.present(updated) });
  };

  remove = async (req: Request<ResourceIdParams>, res: Response): Promise<void> => {
    const { userId } = requireAuth(req);
    await this.service.remove(req.params.id, userId);
    sendNoContent(res);
  };
}
