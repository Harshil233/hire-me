import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { API_PREFIX } from '../../src/config/constants';
import { buildOpenApiDocument } from '../../src/modules/docs/openapi.document';
import type { HttpMethod } from '../../src/modules/docs/openapi.types';
import { startTestServer, type TestServer } from '../helpers/test-server';

/**
 * The contract test that makes the published document trustworthy.
 *
 * Schemas cannot drift from the validators because they *are* the validators, converted
 * at boot. Paths are the one part still written by hand — so every documented path and
 * method is fired at the real application here, and must not come back
 * `ROUTE_NOT_FOUND`. A documented endpoint that does not exist fails the build.
 */

const document = buildOpenApiDocument({ version: '1.0.0' });

/** Any syntactically valid ObjectId: the request must reach the route, not pass validation. */
const SAMPLE_ID = '507f1f77bcf86cd799439011';

interface DocumentedOperation {
  readonly method: HttpMethod;
  readonly path: string;
  readonly url: string;
}

const documentedOperations: readonly DocumentedOperation[] = Object.entries(document.paths).flatMap(
  ([path, item]) =>
    Object.keys(item).map((method) => ({
      method: method as HttpMethod,
      path,
      url: `${API_PREFIX}${path.replace(/\{[^}]+\}/g, SAMPLE_ID)}`,
    })),
);

describe('the published contract matches the running API', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  }, 120_000);

  afterAll(async () => {
    await server.stop();
  });

  it('documents a non-trivial number of operations', () => {
    expect(documentedOperations.length).toBeGreaterThan(40);
  });

  it.each(documentedOperations)('$method $path is a real route', async ({ method, url }) => {
    const response = await request(server.app)[method](url);

    // Unauthenticated, so most answer 401 or 422 — what matters is that the router
    // recognised the path at all.
    expect(response.body?.error?.code).not.toBe('ROUTE_NOT_FOUND');
    expect(response.status).not.toBe(404);
  });
});

describe('the contract is reachable from the running API', () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  }, 120_000);

  afterAll(async () => {
    await server.stop();
  });

  it('serves the OpenAPI document without a session', async () => {
    const response = await request(server.app).get(`${API_PREFIX}/openapi.json`);

    expect(response.status).toBe(200);
    expect(response.body.info.title).toBe('Hire Me API');
  });

  it('serves Swagger UI without a session', async () => {
    const response = await request(server.app).get(`${API_PREFIX}/docs/`);

    expect(response.status).toBe(200);
    expect(response.text).toContain('swagger-ui');
  });
});
