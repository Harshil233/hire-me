import type { Router, RequestHandler } from 'express';

import { createOwnedResourceRouter } from '../../common/http/owned-resource.router';
import type { OwnedResourceController } from '../../common/http/owned-resource.controller';
import type { Certification } from './certification.interface';
import {
  certificationInputSchema,
  type CertificationInput,
  type CertificationResponse,
} from './certification.schema';

export const createCertificationRouter = (
  controller: OwnedResourceController<Certification, CertificationInput, CertificationResponse>,
  authenticate: RequestHandler,
): Router =>
  createOwnedResourceRouter({ controller, authenticate, bodySchema: certificationInputSchema });
