/** Structured log payload attached to a log line. */
export type LogContext = Record<string, unknown>;

/**
 * Logging port. Every consumer depends on this interface, never on the concrete
 * logging library (CLAUDE.md §8).
 */
export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  /** Returns a logger that stamps `context` onto every subsequent line. */
  child(context: LogContext): ILogger;
}
