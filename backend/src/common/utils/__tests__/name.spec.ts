import { describe, expect, it } from 'vitest';

import { fullName } from '../name';

describe('fullName', () => {
  it('joins the parts that are present', () => {
    expect(fullName({ firstName: 'Ada', middleName: 'B', lastName: 'Lovelace' })).toBe(
      'Ada B Lovelace',
    );
  });

  it('skips a missing middle name without leaving a double space', () => {
    expect(fullName({ firstName: 'Ada', lastName: 'Lovelace' })).toBe('Ada Lovelace');
  });

  it('ignores blank parts', () => {
    expect(fullName({ firstName: 'Ada', middleName: '   ', lastName: 'Lovelace' })).toBe(
      'Ada Lovelace',
    );
  });

  it('trims each part', () => {
    expect(fullName({ firstName: '  Ada  ', lastName: '  Lovelace ' })).toBe('Ada Lovelace');
  });

  it('returns an empty string when nothing is known', () => {
    expect(fullName({})).toBe('');
  });
});
