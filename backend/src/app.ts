import express, { type Express, type RequestHandler, Router } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';

import { API_PREFIX, API_VERSION } from './config/constants';
import type { Env } from './config/env';
import type { ILogger } from './common/types/logger';
import {
  createErrorHandler,
  notFoundHandler,
} from './common/middlewares/error-handler.middleware';
import { createRateLimiter } from './common/middlewares/rate-limit.middleware';
import { createRequestIdMiddleware } from './common/middlewares/request-id.middleware';
import type { Container } from './container/container';
import {
  APPLICATION_CONTROLLER,
  AUTHENTICATE_MIDDLEWARE,
  AUTH_CONTROLLER,
  AUTH_RATE_LIMITER,
  CANDIDATE_CONTROLLER,
  OUTREACH_CONTROLLER,
  OUTREACH_RATE_LIMITER,
  CERTIFICATION_CONTROLLER,
  COMPANY_CONTROLLER,
  EDUCATION_CONTROLLER,
  EXPERIENCE_CONTROLLER,
  FILE_CONTROLLER,
  HEALTH_CONTROLLER,
  JOB_CONTROLLER,
  NOTIFICATION_CONTROLLER,
  PROFILE_CONTROLLER,
  PROFILE_UPDATE_VALIDATOR,
  PROJECT_CONTROLLER,
  UPLOAD_MIDDLEWARE,
} from './container/tokens';
import {
  createApplicationRouter,
  createJobApplicationRouter,
} from './modules/application/application.routes';
import { createAuthRouter } from './modules/auth/auth.routes';
import { createCandidateRouter } from './modules/candidate/candidate.routes';
import { createDocsRouter } from './modules/docs/docs.routes';
import { buildOpenApiDocument } from './modules/docs/openapi.document';
import { createOutreachRouter } from './modules/outreach/outreach.routes';
import { createCertificationRouter } from './modules/certification/certification.routes';
import { createCompanyRouter } from './modules/company/company.routes';
import { createEducationRouter } from './modules/education/education.routes';
import { createExperienceRouter } from './modules/experience/experience.routes';
import { createFileRouter } from './modules/file/file.routes';
import { createHealthRouter } from './modules/health/health.routes';
import { createJobRouter } from './modules/job/job.routes';
import { createNotificationRouter } from './modules/notification/notification.routes';
import { createProfileRouter } from './modules/profile/profile.routes';
import { createProjectRouter } from './modules/project/project.routes';

/** Builds the versioned API router from the wired container. */
const createApiRouter = (container: Container): Router => {
  const router = Router();
  const authenticate: RequestHandler = container.resolve(AUTHENTICATE_MIDDLEWARE);

  router.use('/health', createHealthRouter(container.resolve(HEALTH_CONTROLLER)));

  // The contract, served from the API itself: `/docs` for a human, `/openapi.json` for a
  // generator. Built from the same Zod schemas the routes validate with, so it is
  // regenerated on every boot and cannot drift from what the API actually accepts.
  router.use(createDocsRouter({ document: buildOpenApiDocument({ version: API_VERSION }) }));

  router.use(
    createAuthRouter({
      controller: container.resolve(AUTH_CONTROLLER),
      authenticate,
      authRateLimiter: container.resolve(AUTH_RATE_LIMITER),
    }),
  );

  router.use(
    '/profile',
    createProfileRouter({
      controller: container.resolve(PROFILE_CONTROLLER),
      authenticate,
      validateUpdate: container.resolve(PROFILE_UPDATE_VALIDATOR),
    }),
  );

  router.use(
    '/company',
    createCompanyRouter({ controller: container.resolve(COMPANY_CONTROLLER), authenticate }),
  );

  const applicationController = container.resolve(APPLICATION_CONTROLLER);

  router.use(
    '/jobs',
    createJobRouter({ controller: container.resolve(JOB_CONTROLLER), authenticate }),
  );
  // Job-scoped application routes share the `/jobs` prefix. They are mounted after the
  // job router, whose `/:id` routes match a single segment and so never swallow these.
  router.use('/jobs', createJobApplicationRouter({ controller: applicationController, authenticate }));
  router.use(
    '/applications',
    createApplicationRouter({ controller: applicationController, authenticate }),
  );
  router.use(
    '/outreach',
    createOutreachRouter({
      controller: container.resolve(OUTREACH_CONTROLLER),
      authenticate,
      outreachRateLimiter: container.resolve(OUTREACH_RATE_LIMITER),
    }),
  );

  router.use(
    '/candidates',
    createCandidateRouter({
      controller: container.resolve(CANDIDATE_CONTROLLER),
      authenticate,
    }),
  );

  router.use(
    '/notifications',
    createNotificationRouter({
      controller: container.resolve(NOTIFICATION_CONTROLLER),
      authenticate,
    }),
  );

  router.use(
    '/files',
    createFileRouter({
      controller: container.resolve(FILE_CONTROLLER),
      authenticate,
      upload: container.resolve(UPLOAD_MIDDLEWARE),
    }),
  );

  router.use(
    '/experience',
    createExperienceRouter(container.resolve(EXPERIENCE_CONTROLLER), authenticate),
  );
  router.use(
    '/education',
    createEducationRouter(container.resolve(EDUCATION_CONTROLLER), authenticate),
  );
  router.use(
    '/certification',
    createCertificationRouter(container.resolve(CERTIFICATION_CONTROLLER), authenticate),
  );
  router.use('/project', createProjectRouter(container.resolve(PROJECT_CONTROLLER), authenticate));

  return router;
};

export interface AppDependencies {
  readonly container: Container;
  readonly env: Env;
  readonly logger: ILogger;
}

/** Framework wiring only — no business logic lives in this file. */
export const createApp = ({ container, env, logger }: AppDependencies): Express => {
  const app = express();

  if (env.NODE_ENV === 'production') {
    // One hop: the reverse proxy in front of the container.
    app.set('trust proxy', 1);
  }

  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(createRequestIdMiddleware());
  app.use(
    createRateLimiter({ windowMs: env.RATE_LIMIT_WINDOW_MS, max: env.RATE_LIMIT_MAX }),
  );

  app.use(API_PREFIX, createApiRouter(container));

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
};
