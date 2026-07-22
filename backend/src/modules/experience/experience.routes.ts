import type { Router, RequestHandler } from 'express';

import { createOwnedResourceRouter } from '../../common/http/owned-resource.router';
import type { OwnedResourceController } from '../../common/http/owned-resource.controller';
import type { Experience } from './experience.interface';
import { experienceInputSchema, type ExperienceInput, type ExperienceResponse } from './experience.schema';

export const createExperienceRouter = (
  controller: OwnedResourceController<Experience, ExperienceInput, ExperienceResponse>,
  authenticate: RequestHandler,
): Router =>
  createOwnedResourceRouter({ controller, authenticate, bodySchema: experienceInputSchema });
