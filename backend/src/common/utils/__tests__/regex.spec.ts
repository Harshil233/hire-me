import { describe, expect, it } from 'vitest';

import { escapeRegex } from '../regex';

describe('escapeRegex', () => {
  it('leaves an ordinary term untouched', () => {
    expect(escapeRegex('TypeScript')).toBe('TypeScript');
  });

  it('escapes every metacharacter it knows about', () => {
    expect(escapeRegex('.*+?^${}()|[]\\')).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
  });

  it('makes a wildcard match literally rather than match everything', () => {
    expect(new RegExp(escapeRegex('.*')).test('anything')).toBe(false);
    expect(new RegExp(escapeRegex('.*')).test('a .* b')).toBe(true);
  });

  it('keeps an anchored pattern anchored when the term contains an anchor', () => {
    expect(new RegExp(`^${escapeRegex('c++')}$`, 'i').test('C++')).toBe(true);
    expect(new RegExp(`^${escapeRegex('c++')}$`, 'i').test('cxx')).toBe(false);
  });

  it('cannot be used to smuggle an alternation past the anchors', () => {
    const pattern = new RegExp(`^${escapeRegex('pune|mumbai')}$`, 'i');

    expect(pattern.test('pune')).toBe(false);
    expect(pattern.test('pune|mumbai')).toBe(true);
  });

  it('returns an empty string unchanged', () => {
    expect(escapeRegex('')).toBe('');
  });
});
