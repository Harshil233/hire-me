import { describe, expect, it } from 'vitest';

import { countActiveFilters, readFilters, writeFilters } from '../filter-params';

describe('readFilters', () => {
  it('pulls the named keys out of the query string', () => {
    const params = new URLSearchParams('search=react&location=Pune');

    expect(readFilters(params, ['search', 'location'])).toEqual({
      page: 1,
      search: 'react',
      location: 'Pune',
    });
  });

  it('reports a missing key as undefined rather than an empty string', () => {
    expect(readFilters(new URLSearchParams(''), ['search']).search).toBeUndefined();
  });

  it('ignores query keys the caller did not ask for', () => {
    const filters = readFilters(new URLSearchParams('search=react&evil=1'), ['search']);

    expect(filters).not.toHaveProperty('evil');
  });

  it('defaults the page to 1 and reads it when present', () => {
    expect(readFilters(new URLSearchParams(''), []).page).toBe(1);
    expect(readFilters(new URLSearchParams('page=4'), []).page).toBe(4);
  });
});

describe('writeFilters', () => {
  it('keeps the values the user actually chose', () => {
    expect(writeFilters({ search: 'react', minCtc: 500000 })).toEqual({
      search: 'react',
      minCtc: '500000',
    });
  });

  it('drops undefined and blank values', () => {
    expect(writeFilters({ search: undefined, location: '', role: '   ' })).toEqual({});
  });

  it('leaves page 1 out of the URL but keeps a later page', () => {
    expect(writeFilters({ page: 1 })).toEqual({});
    expect(writeFilters({ page: 3 })).toEqual({ page: '3' });
  });
});

describe('countActiveFilters', () => {
  it('counts only the filters that are set', () => {
    expect(countActiveFilters({ search: 'react', location: undefined, role: '' })).toBe(1);
  });

  it('never counts paging as a filter', () => {
    expect(countActiveFilters({ page: 7 })).toBe(0);
  });

  it('is zero for an empty bag', () => {
    expect(countActiveFilters({})).toBe(0);
  });
});
