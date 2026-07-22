import { Router, type RequestHandler } from 'express';
import type { ZodType } from 'zod';

import { ROLES } from '../../config/constants';
import { authorize } from '../middlewares/authorize.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import { objectIdSchema } from '../validation/fields';
import type { OwnedEntity } from '../persistence/owned-resource.types';
import type { OwnedResourceController } from './owned-resource.controller';
import { z } from 'zod';

export const resourceIdParamsSchema = z.object({ id: objectIdSchema });

export interface OwnedResourceRouterDependencies<TEntity extends OwnedEntity, TInput, TResponse> {
  readonly controller: OwnedResourceController<TEntity, TInput, TResponse>;
  readonly authenticate: RequestHandler;
  /** Same schema for create and update — the sections use full-replace PUT semantics. */
  readonly bodySchema: ZodType;
}

/**
 * Route table shared by experience, education, certification and project.
 * All four are candidate-owned, so the role guard lives here.
 */
export const createOwnedResourceRouter = <TEntity extends OwnedEntity, TInput, TResponse>({
  controller,
  authenticate,
  bodySchema,
}: OwnedResourceRouterDependencies<TEntity, TInput, TResponse>): Router => {
  const router = Router();
  const guards = [authenticate, authorize(ROLES.CANDIDATE)];

  router.get('/', ...guards, controller.list);
  router.post('/', ...guards, validateRequest({ body: bodySchema }), controller.create);
  router.put(
    '/:id',
    ...guards,
    validateRequest({ params: resourceIdParamsSchema, body: bodySchema }),
    controller.update,
  );
  router.delete(
    '/:id',
    ...guards,
    validateRequest({ params: resourceIdParamsSchema }),
    controller.remove,
  );

  return router;
};
