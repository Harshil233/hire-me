import { describe, expect, it } from 'vitest';

import { sha256 } from '../hash';

describe('sha256', () => {
  it('produces a stable 64-character hex digest', () => {
    const digest = sha256('token-value');

    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256('token-value')).toBe(digest);
  });

  it('produces different digests for different inputs', () => {
    expect(sha256('a')).not.toBe(sha256('b'));
  });

  it('never returns the input', () => {
    expect(sha256('secret')).not.toContain('secret');
  });
});
