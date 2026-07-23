import { describe, expect, it } from 'vitest';

import { SEARCH } from '../../../config/constants';
import { toSearchTerms } from '../search-terms';

describe('toSearchTerms', () => {
  it('treats a single word as one term', () => {
    expect(toSearchTerms('neel')).toEqual(['neel']);
  });

  it('splits a first name from a surname', () => {
    expect(toSearchTerms('neel ch')).toEqual(['neel', 'ch']);
  });

  it('collapses runs of whitespace rather than emitting blanks', () => {
    expect(toSearchTerms('  neel   ch  ')).toEqual(['neel', 'ch']);
  });

  it('splits on tabs and newlines too', () => {
    expect(toSearchTerms('neel\tch\nrao')).toEqual(['neel', 'ch', 'rao']);
  });

  it('returns nothing for a blank query', () => {
    expect(toSearchTerms('   ')).toEqual([]);
    expect(toSearchTerms('')).toEqual([]);
  });

  it('caps a pathological query so the filter cannot grow without bound', () => {
    const words = Array.from({ length: SEARCH.MAX_TERMS + 10 }, (_, i) => `w${String(i)}`);

    expect(toSearchTerms(words.join(' '))).toHaveLength(SEARCH.MAX_TERMS);
  });

  it('keeps the words in the order they were typed', () => {
    expect(toSearchTerms('a b c')).toEqual(['a', 'b', 'c']);
  });
});
