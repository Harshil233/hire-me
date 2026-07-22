import type { Router, RequestHandler } from 'express';

import { createOwnedResourceRouter } from '../../common/http/owned-resource.router';
import type { OwnedResourceController } from '../../common/http/owned-resource.controller';
import type { Education } from './education.interface';
import { educationInputSchema, type EducationInput, type EducationResponse } from './education.schema';

export const createEducationRouter = (
  controller: OwnedResourceController<Education, EducationInput, EducationResponse>,
  authenticate: RequestHandler,
): Router =>
  createOwnedResourceRouter({ controller, authenticate, bodySchema: educationInputSchema });
