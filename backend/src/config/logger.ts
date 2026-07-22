import pino, { type Logger as PinoInstance } from 'pino';

import type { ILogger, LogContext } from '../common/types/logger';
import { env } from './env';

/** Adapter: keeps the pino API from leaking past the `ILogger` port. */
class PinoLoggerAdapter implements ILogger {
  constructor(private readonly instance: PinoInstance) {}

  debug(message: string, context: LogContext = {}): void {
    this.instance.debug(context, message);
  }

  info(message: string, context: LogContext = {}): void {
    this.instance.info(context, message);
  }

  warn(message: string, context: LogContext = {}): void {
    this.instance.warn(context, message);
  }

  error(message: string, context: LogContext = {}): void {
    this.instance.error(context, message);
  }

  child(context: LogContext): ILogger {
    return new PinoLoggerAdapter(this.instance.child(context));
  }
}

const rootInstance = pino({
  level: env.LOG_LEVEL,
  base: { service: 'hire-me-api' },
  redact: {
    paths: [
      'password',
      'passwordHash',
      'req.headers.authorization',
      'req.headers.cookie',
      'accessToken',
      'refreshToken',
    ],
    censor: '[redacted]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

/** Singleton — the only permitted one besides the DB connection (CLAUDE.md §4). */
export const logger: ILogger = new PinoLoggerAdapter(rootInstance);

export { PinoLoggerAdapter };
