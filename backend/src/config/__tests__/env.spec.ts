import { describe, expect, it } from 'vitest';

import { EnvValidationError, parseEnv } from '../env';

const VALID_ENV = {
  MONGO_URI: 'mongodb://localhost:27017',
  MONGO_DB_NAME: 'hire_me',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

describe('parseEnv', () => {
  it('applies defaults for every optional variable', () => {
    const env = parseEnv({ ...VALID_ENV });

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(8080);
    expect(env.JWT_ACCESS_TTL).toBe('15m');
    expect(env.BCRYPT_ROUNDS).toBe(12);
    expect(env.COOKIE_SECURE).toBe(false);
    expect(env.FILE_STORAGE_DRIVER).toBe('local');
  });

  it('coerces numeric variables from strings', () => {
    const env = parseEnv({ ...VALID_ENV, PORT: '3000', MAX_UPLOAD_BYTES: '1024' });

    expect(env.PORT).toBe(3000);
    expect(env.MAX_UPLOAD_BYTES).toBe(1024);
  });

  it('splits CORS origins into a trimmed list', () => {
    const env = parseEnv({
      ...VALID_ENV,
      CORS_ORIGINS: 'http://a.test , http://b.test ,,',
    });

    expect(env.CORS_ORIGINS).toEqual(['http://a.test', 'http://b.test']);
  });

  it('parses boolean-ish variables', () => {
    expect(parseEnv({ ...VALID_ENV, COOKIE_SECURE: 'true' }).COOKIE_SECURE).toBe(true);
    expect(parseEnv({ ...VALID_ENV, COOKIE_SECURE: 'false' }).COOKIE_SECURE).toBe(false);
  });

  it('returns a frozen object', () => {
    const env = parseEnv({ ...VALID_ENV });

    expect(Object.isFrozen(env)).toBe(true);
  });

  it('throws when a required variable is missing', () => {
    expect(() => parseEnv({ ...VALID_ENV, MONGO_URI: undefined })).toThrow(EnvValidationError);
  });

  it('lists every offending variable in the message', () => {
    try {
      parseEnv({ MONGO_DB_NAME: 'x', JWT_ACCESS_SECRET: 'short' });
      expect.unreachable('parseEnv should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvValidationError);
      const issues = (error as EnvValidationError).issues;
      expect(issues.some((issue) => issue.startsWith('MONGO_URI'))).toBe(true);
      expect(issues.some((issue) => issue.includes('JWT_ACCESS_SECRET'))).toBe(true);
      expect(issues.some((issue) => issue.includes('JWT_REFRESH_SECRET'))).toBe(true);
    }
  });

  it('rejects a secret shorter than 32 characters', () => {
    expect(() => parseEnv({ ...VALID_ENV, JWT_ACCESS_SECRET: 'too-short' })).toThrow(
      /at least 32 characters/,
    );
  });

  it('rejects a malformed token lifetime', () => {
    expect(() => parseEnv({ ...VALID_ENV, JWT_ACCESS_TTL: 'fifteen minutes' })).toThrow(
      /duration/,
    );
  });

  it('rejects an out-of-range port', () => {
    expect(() => parseEnv({ ...VALID_ENV, PORT: '70000' })).toThrow(EnvValidationError);
  });

  it('rejects an unknown cookie policy', () => {
    expect(() => parseEnv({ ...VALID_ENV, COOKIE_SAME_SITE: 'always' })).toThrow(
      EnvValidationError,
    );
  });
});
