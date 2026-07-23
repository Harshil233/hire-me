import { describe, expect, it } from 'vitest';

import {
  formatDateRange,
  formatMonthYear,
  formatRelativeTime,
  fullName,
  initials,
  toDateInputValue,
} from '../format';

describe('formatMonthYear', () => {
  it('renders a short month and year', () => {
    expect(formatMonthYear('2024-03-05T00:00:00.000Z')).toMatch(/Mar 2024/);
  });

  it('returns an empty string for missing or unparsable input', () => {
    expect(formatMonthYear(undefined)).toBe('');
    expect(formatMonthYear('')).toBe('');
    expect(formatMonthYear('not-a-date')).toBe('');
  });
});

describe('formatDateRange', () => {
  it('renders a closed range', () => {
    expect(formatDateRange('2021-01-01T00:00:00.000Z', '2023-03-01T00:00:00.000Z')).toMatch(
      /Jan 2021 — Mar 2023/,
    );
  });

  it('renders an ongoing range as "Present"', () => {
    expect(formatDateRange('2021-01-01T00:00:00.000Z', undefined, true)).toMatch(
      /Jan 2021 — Present/,
    );
  });

  it('renders only the start when there is no end date', () => {
    expect(formatDateRange('2021-01-01T00:00:00.000Z', undefined)).toMatch(/^Jan 2021$/);
  });

  it('prefers "Present" over a stale end date', () => {
    expect(formatDateRange('2021-01-01T00:00:00.000Z', '2023-01-01T00:00:00.000Z', true)).toMatch(
      /Present/,
    );
  });

  it('returns an empty string without a start date', () => {
    expect(formatDateRange(undefined, '2023-01-01T00:00:00.000Z')).toBe('');
  });
});

describe('toDateInputValue', () => {
  it('reduces an ISO timestamp to a date-input value', () => {
    expect(toDateInputValue('2024-03-05T10:30:00.000Z')).toBe('2024-03-05');
  });

  it('returns an empty string for missing or invalid input', () => {
    expect(toDateInputValue(undefined)).toBe('');
    expect(toDateInputValue('nope')).toBe('');
  });
});

describe('fullName', () => {
  it('joins the parts that are present', () => {
    expect(fullName({ firstName: 'Ada', middleName: 'B', lastName: 'Lovelace' })).toBe(
      'Ada B Lovelace',
    );
    expect(fullName({ firstName: 'Ada', lastName: 'Lovelace' })).toBe('Ada Lovelace');
  });

  it('ignores blank parts', () => {
    expect(fullName({ firstName: 'Ada', middleName: '   ', lastName: 'Lovelace' })).toBe(
      'Ada Lovelace',
    );
    expect(fullName({})).toBe('');
  });
});

describe('initials', () => {
  it('takes the first letter of the first and last name', () => {
    expect(initials({ firstName: 'ada', lastName: 'lovelace' })).toBe('AL');
  });

  it('copes with a partial name', () => {
    expect(initials({ firstName: 'Ada' })).toBe('A');
    expect(initials({})).toBe('');
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-03-10T12:00:00.000Z').getTime();
  const ago = (ms: number): string => new Date(now - ms).toISOString();

  it('reports anything under a minute as "just now"', () => {
    expect(formatRelativeTime(ago(30_000), now)).toBe('just now');
  });

  it('reports minutes', () => {
    expect(formatRelativeTime(ago(5 * 60_000), now)).toBe('5m ago');
  });

  it('reports hours', () => {
    expect(formatRelativeTime(ago(4 * 60 * 60_000), now)).toBe('4h ago');
  });

  it('reports days', () => {
    expect(formatRelativeTime(ago(3 * 24 * 60 * 60_000), now)).toBe('3d ago');
  });

  it('falls back to a month and year beyond a week', () => {
    expect(formatRelativeTime(ago(40 * 24 * 60 * 60_000), now)).toMatch(/\d{4}/);
  });

  it('returns an empty string for an unparsable timestamp', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('');
  });
});
