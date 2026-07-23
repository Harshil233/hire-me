import { Router, type Request, type Response } from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import type { OpenApiDocument } from './openapi.types';

export interface DocsRoutesDependencies {
  readonly document: OpenApiDocument;
}

/**
 * Swagger UI ships an inline bootstrap script, which the application-wide
 * `default-src 'self'` content-security policy blocks. Rather than weaken the policy for
 * the whole API, a relaxed one is applied to this subtree alone: inline script and style
 * from our own origin, and nothing else — no remote script, no framing, no object.
 */
const docsContentSecurityPolicy = helmet.contentSecurityPolicy({
  useDefaults: false,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameAncestors: ["'none'"],
  },
});

/**
 * Serves the API contract two ways: as raw OpenAPI JSON for tooling (client generators,
 * contract tests, Postman), and as Swagger UI for a human with a browser.
 */
export const createDocsRouter = ({ document }: DocsRoutesDependencies): Router => {
  const router = Router();

  router.get('/openapi.json', (_req: Request, res: Response) => {
    res.json(document);
  });

  router.use(
    '/docs',
    docsContentSecurityPolicy,
    swaggerUi.serve,
    swaggerUi.setup(document, {
      customSiteTitle: 'Hire Me API',
      swaggerOptions: {
        // Alphabetical beats declaration order once there are forty operations.
        operationsSorter: 'alpha',
        tagsSorter: 'alpha',
        docExpansion: 'none',
        persistAuthorization: true,
      },
    }),
  );

  return router;
};
