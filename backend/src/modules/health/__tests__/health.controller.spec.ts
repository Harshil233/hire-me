import { describe, expect, it, vi } from 'vitest';

import { createMockRequest, createMockResponse } from '../../../../tests/helpers/express-mocks';
import type { IDatabaseConnection } from '../../../database/connection';
import { HealthController } from '../health.controller';

const NOW = new Date('2026-01-15T10:00:00.000Z');

const createDatabase = (healthy: boolean): IDatabaseConnection => ({
  connect: vi.fn(async () => undefined),
  disconnect: vi.fn(async () => undefined),
  isHealthy: vi.fn(async () => healthy),
});

describe('HealthController', () => {
  it('reports 200 and ok when the database answers', async () => {
    const res = createMockResponse();

    await new HealthController(createDatabase(true), () => NOW).check(createMockRequest(), res);

    expect(res.capturedStatus).toBe(200);
    expect(res.capturedBody).toEqual({
      success: true,
      data: { status: 'ok', database: 'up', timestamp: NOW.toISOString() },
    });
  });

  it('reports 503 and degraded when the database is unreachable', async () => {
    const res = createMockResponse();

    await new HealthController(createDatabase(false), () => NOW).check(createMockRequest(), res);

    expect(res.capturedStatus).toBe(503);
    expect(res.capturedBody).toMatchObject({
      data: { status: 'degraded', database: 'down' },
    });
  });

  it('defaults to the real clock', async () => {
    const res = createMockResponse();

    await new HealthController(createDatabase(true)).check(createMockRequest(), res);

    expect(res.capturedStatus).toBe(200);
  });
});
