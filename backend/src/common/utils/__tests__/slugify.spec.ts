import { describe, expect, it } from 'vitest';

import { slugify } from '../slugify';

describe('slugify', () => {
  it('lowercases and dashes a plain name', () => {
    expect(slugify('Acme Corp')).toBe('acme-corp');
  });

  it('strips accents', () => {
    expect(slugify('Café Résumé')).toBe('cafe-resume');
  });

  it('collapses runs of punctuation into a single dash', () => {
    expect(slugify('Acme   ---  &&&  Co.')).toBe('acme-co');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('  ...Acme...  ')).toBe('acme');
  });

  it('returns an empty string when nothing usable remains', () => {
    expect(slugify('###')).toBe('');
    expect(slugify('')).toBe('');
  });

  it('caps the length at 80 characters', () => {
    expect(slugify('a'.repeat(200))).toHaveLength(80);
  });
});
