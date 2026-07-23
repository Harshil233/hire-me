import express, { type Express } from 'express';
import helmet from 'helmet';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import { createDocsRouter } from '../docs.routes';
import { buildOpenApiDocument } from '../openapi.document';

/**
 * Mounted behind the same default helmet policy the real app uses, so the relaxed
 * content-security policy for this subtree is exercised rather than assumed.
 */
const buildApp = (): Express => {
  const app = express();
  app.use(helmet());
  app.use(createDocsRouter({ document: buildOpenApiDocument({ version: '1.0.0' }) }));
  return app;
};

describe('GET /openapi.json', () => {
  let app: Express;

  beforeAll(() => {
    app = buildApp();
  });

  it('serves the document as JSON', async () => {
    const response = await request(app).get('/openapi.json');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
  });

  it('serves a document a generator can consume', async () => {
    const response = await request(app).get('/openapi.json');

    expect(response.body.openapi).toBe('3.1.0');
    expect(Object.keys(response.body.paths).length).toBeGreaterThan(0);
    expect(response.body.components.schemas.Job).toBeDefined();
  });
});

describe('GET /docs', () => {
  let app: Express;

  beforeAll(() => {
    app = buildApp();
  });

  it('serves Swagger UI', async () => {
    const response = await request(app).get('/docs/');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('swagger-ui');
  });

  it('relaxes the content-security policy just enough for the inline bootstrap', async () => {
    const response = await request(app).get('/docs/');
    const policy = response.headers['content-security-policy'] ?? '';

    expect(policy).toContain("script-src 'self' 'unsafe-inline'");
  });

  it('still refuses remote script and framing on the docs subtree', async () => {
    const response = await request(app).get('/docs/');
    const policy = response.headers['content-security-policy'] ?? '';

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
  });

  it('leaves inline script blocked everywhere else', async () => {
    const response = await request(app).get('/openapi.json');
    const policy = response.headers['content-security-policy'] ?? '';

    // helmet's default policy permits inline *style*; it is inline *script* that the
    // docs subtree relaxes, and that relaxation must not leak past it.
    expect(policy).toContain("script-src 'self'");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it('serves the UI assets from our own origin, not a CDN', async () => {
    const response = await request(app).get('/docs/swagger-ui-bundle.js');

    expect(response.status).toBe(200);
  });
});
