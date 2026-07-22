import { describe, expect, it } from 'vitest';

import { EnvValidationError, env, parseEnv } from '../env';

describe('parseEnv', () => {
  it('accepts a valid API base URL', () => {
    const parsed = parseEnv({ VITE_API_BASE_URL: 'http://localhost:8080/api/v1' });

    expect(parsed.VITE_API_BASE_URL).toBe('http://localhost:8080/api/v1');
    expect(Object.isFrozen(parsed)).toBe(true);
  });

  it.each([undefined, '', 'not-a-url'])('rejects %s', (value) => {
    expect(() => parseEnv({ VITE_API_BASE_URL: value })).toThrow(EnvValidationError);
  });

  it('names the offending variable', () => {
    try {
      parseEnv({});
      expect.unreachable('parseEnv should have thrown');
    } catch (error) {
      expect((error as EnvValidationError).issues[0]).toContain('VITE_API_BASE_URL');
    }
  });
});

describe('env', () => {
  it('is populated at import time', () => {
    expect(env.VITE_API_BASE_URL).toMatch(/^https?:\/\//);
  });
});
