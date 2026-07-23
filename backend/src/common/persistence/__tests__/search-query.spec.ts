import { describe, expect, it } from 'vitest';

import { matchEverySearchWord } from '../search-query';

interface Condition {
  readonly firstName?: RegExp;
  readonly lastName?: RegExp;
}

const nameFields = (term: RegExp): Condition[] => [{ firstName: term }, { lastName: term }];

describe('matchEverySearchWord', () => {
  it('produces one condition per word, so all of them must match', () => {
    expect(matchEverySearchWord('neel ch', nameFields)).toHaveLength(2);
  });

  it('offers every field the caller names as an alternative for that word', () => {
    const [first] = matchEverySearchWord('neel', nameFields);

    expect(first?.$or).toHaveLength(2);
  });

  it('matches a word case-insensitively', () => {
    const [first] = matchEverySearchWord('neel', nameFields);
    const pattern = first?.$or[0]?.firstName;

    expect(pattern?.test('Neel')).toBe(true);
  });

  it('escapes the word, so a metacharacter cannot widen the match', () => {
    const [first] = matchEverySearchWord('.*', nameFields);
    const pattern = first?.$or[0]?.firstName;

    expect(pattern?.test('anything')).toBe(false);
    expect(pattern?.test('a .* b')).toBe(true);
  });

  it('hands the raw word back, so a caller can look it up elsewhere', () => {
    const seen: string[] = [];

    matchEverySearchWord('neel ch', (term, word) => {
      seen.push(word);
      return [{ firstName: term }];
    });

    expect(seen).toEqual(['neel', 'ch']);
  });

  it('produces nothing for a blank query, leaving the filter untouched', () => {
    expect(matchEverySearchWord('   ', nameFields)).toEqual([]);
  });
});
