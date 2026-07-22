import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/__tests__/**/*.spec.ts', 'tests/**/*.spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    pool: 'forks',
    // `config/env.ts` fails fast on an invalid environment, so tests boot with a
    // complete, deterministic one.
    env: {
      NODE_ENV: 'test',
      PORT: '8080',
      LOG_LEVEL: 'silent',
      MONGO_URI: 'mongodb://127.0.0.1:27017',
      MONGO_DB_NAME: 'hire_me_test',
      JWT_ACCESS_SECRET: 'test-access-secret-that-is-long-enough-1234',
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-long-enough-1234',
      JWT_REFRESH_TTL: '7d',
      BCRYPT_ROUNDS: '4',
      CORS_ORIGINS: 'http://localhost:5173',
      COOKIE_SECURE: 'false',
      COOKIE_SAME_SITE: 'lax',
      RATE_LIMIT_WINDOW_MS: '900000',
      RATE_LIMIT_MAX: '100000',
      AUTH_RATE_LIMIT_MAX: '100000',
      FILE_STORAGE_DRIVER: 'local',
      FILE_STORAGE_PATH: './.tmp-uploads',
      MAX_UPLOAD_BYTES: '5242880',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      // Only the bootstrap entrypoint, type-only files and barrels are excluded
      // (CLAUDE.md §11 — coverage is never raised by hiding real code).
      exclude: ['src/server.ts', 'src/**/*.interface.ts', 'src/common/types/**', 'src/**/index.ts'],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
