import type { Router, RequestHandler } from 'express';

import { createOwnedResourceRouter } from '../../common/http/owned-resource.router';
import type { OwnedResourceController } from '../../common/http/owned-resource.controller';
import type { Project } from './project.interface';
import { projectInputSchema, type ProjectInput, type ProjectResponse } from './project.schema';

export const createProjectRouter = (
  controller: OwnedResourceController<Project, ProjectInput, ProjectResponse>,
  authenticate: RequestHandler,
): Router =>
  createOwnedResourceRouter({ controller, authenticate, bodySchema: projectInputSchema });
