import { vi } from 'vitest';

import type { ILogger } from '../../src/common/types/logger';

/** Silent logger that still records calls, so tests can assert on logging. */
export const createFakeLogger = (): ILogger => {
  const logger: ILogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn((): ILogger => logger),
  };

  return logger;
};

/** Frozen clock for deterministic time-dependent assertions. */
export const FIXED_NOW = new Date('2026-01-15T10:00:00.000Z');
export const fixedClock = (): Date => FIXED_NOW;
