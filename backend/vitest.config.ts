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
      // Pinned so the suite does not depend on whatever a developer has in `.env`.
      MAIL_DRIVER: 'log',
      MAIL_REDIRECT_TO: '',
      APP_BASE_URL: 'http://localhost:5173',
      UNSUBSCRIBE_SECRET: 'test-unsubscribe-secret-that-is-long-enough',
      OUTREACH_MAX_RECIPIENTS: '200',
      OUTREACH_DAILY_LIMIT: '500',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      // Only bootstrap entrypoints, type-only files and barrels are excluded
      // (CLAUDE.md §11 — coverage is never raised by hiding real code). The seed is a
      // developer script with its own entrypoint, and it holds no business rules: it
      // drives the same services the API does.
      exclude: [
        'src/server.ts',
        'src/database/seeds/**',
        'src/**/*.interface.ts',
        'src/common/types/**',
        'src/**/index.ts',
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
