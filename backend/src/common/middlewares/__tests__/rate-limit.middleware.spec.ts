import express, { type Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { ERROR_CODES } from '../../errors/error-codes';
import { createFakeLogger } from '../../../../tests/helpers/fakes';
import { createErrorHandler } from '../error-handler.middleware';
import { createRateLimiter } from '../rate-limit.middleware';

/** Minimal app: the limiter in front of one route, behind the real error middleware. */
const createApp = (max: number): Express => {
  const app = express();

  app.use(createRateLimiter({ windowMs: 60_000, max }));
  app.get('/ping', (_req, res) => {
    res.status(200).json({ success: true, data: { pong: true } });
  });
  app.use(createErrorHandler(createFakeLogger()));

  return app;
};

describe('createRateLimiter', () => {
  it('lets requests through while under the limit', async () => {
    const response = await request(createApp(2)).get('/ping').expect(200);

    expect(response.body.data.pong).toBe(true);
  });

  it('answers a throttled request with the standard error envelope', async () => {
    const app = createApp(1);

    await request(app).get('/ping').expect(200);
    const response = await request(app).get('/ping').expect(429);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: ERROR_CODES.RATE_LIMITED,
        message: 'Too many requests, please try again later',
        details: [],
      },
    });
  });

  it('advertises the limit through the draft-7 header and not the legacy ones', async () => {
    const response = await request(createApp(5)).get('/ping').expect(200);

    expect(response.headers['ratelimit']).toContain('limit=5');
    expect(response.headers['x-ratelimit-limit']).toBeUndefined();
  });
});
