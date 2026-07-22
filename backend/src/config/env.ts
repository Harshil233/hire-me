import { resolve } from 'node:path';

import { config as loadDotenvFile } from 'dotenv';
import { z } from 'zod';

/**
 * The single place in the codebase that reads `process.env` (CLAUDE.md §8).
 * Parsing fails fast and loudly: an invalid environment aborts the boot.
 */

/**
 * Populates `process.env` from a `.env` file before anything is parsed.
 *
 * - Variables already present in the real environment always win: dotenv never
 *   overwrites them, so Docker, CI and the test harness stay authoritative.
 * - `backend/.env` is preferred, with a repo-root `.env` as a fallback for a shared
 *   local setup. A missing file is not an error — production supplies real variables.
 */
loadDotenvFile({
  path: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '..', '.env')],
  quiet: true,
});

const booleanFromString = z.enum(['true', 'false']).transform((value) => value === 'true');

/** `15m`, `7d`, `3600s` — the format `jsonwebtoken` accepts for `expiresIn`. */
const durationSchema = z
  .string()
  .regex(/^\d+[smhd]$/, 'must be a duration such as 15m, 24h or 7d');

const csvToList = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65_535).default(8080),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  MONGO_DB_NAME: z.string().min(1, 'MONGO_DB_NAME is required'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: durationSchema.default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_TTL: durationSchema.default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

  CORS_ORIGINS: z.string().default('http://localhost:5173').transform(csvToList),
  COOKIE_SECURE: booleanFromString.prefault('false'),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

  FILE_STORAGE_DRIVER: z.enum(['local']).default('local'),
  FILE_STORAGE_PATH: z.string().min(1).default('./uploads'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(5_242_880),
});

export type Env = Readonly<z.infer<typeof envSchema>>;

/** Thrown when the process environment does not satisfy the schema. */
export class EnvValidationError extends Error {
  constructor(public readonly issues: readonly string[]) {
    super(`Invalid environment configuration:\n  - ${issues.join('\n  - ')}`);
    this.name = 'EnvValidationError';
  }
}

/** Pure parser so the rules can be unit-tested without touching `process.env`. */
export const parseEnv = (source: NodeJS.ProcessEnv): Env => {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`,
    );
    throw new EnvValidationError(issues);
  }

  return Object.freeze(result.data);
};

export const env: Env = parseEnv(process.env);
