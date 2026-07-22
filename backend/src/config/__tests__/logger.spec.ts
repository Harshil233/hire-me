import { describe, expect, it, vi } from 'vitest';
import type { Logger as PinoInstance } from 'pino';

import { PinoLoggerAdapter, logger } from '../logger';

const createPinoStub = (): PinoInstance => {
  const stub = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => stub),
  };

  return stub as unknown as PinoInstance;
};

describe('PinoLoggerAdapter', () => {
  it('forwards each level with its context', () => {
    const pinoStub = createPinoStub();
    const adapter = new PinoLoggerAdapter(pinoStub);

    adapter.debug('debug message', { a: 1 });
    adapter.info('info message', { b: 2 });
    adapter.warn('warn message', { c: 3 });
    adapter.error('error message', { d: 4 });

    expect(pinoStub.debug).toHaveBeenCalledWith({ a: 1 }, 'debug message');
    expect(pinoStub.info).toHaveBeenCalledWith({ b: 2 }, 'info message');
    expect(pinoStub.warn).toHaveBeenCalledWith({ c: 3 }, 'warn message');
    expect(pinoStub.error).toHaveBeenCalledWith({ d: 4 }, 'error message');
  });

  it('defaults the context to an empty object', () => {
    const pinoStub = createPinoStub();

    new PinoLoggerAdapter(pinoStub).info('no context');

    expect(pinoStub.info).toHaveBeenCalledWith({}, 'no context');
  });

  it('creates a child logger that is still an ILogger', () => {
    const pinoStub = createPinoStub();
    const child = new PinoLoggerAdapter(pinoStub).child({ requestId: 'abc' });

    expect(pinoStub.child).toHaveBeenCalledWith({ requestId: 'abc' });
    expect(typeof child.info).toBe('function');
  });

  it('exports a ready-to-use singleton', () => {
    expect(typeof logger.info).toBe('function');
    expect(() => {
      logger.info('smoke');
    }).not.toThrow();
  });
});
