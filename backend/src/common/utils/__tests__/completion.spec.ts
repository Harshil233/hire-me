import { describe, expect, it } from 'vitest';

import { calculateCompletion, hasEntries, isFilled, type CompletionRule } from '../completion';

interface Subject {
  readonly a: boolean;
  readonly b: boolean;
}

const RULES: readonly CompletionRule<Subject>[] = [
  { key: 'a', label: 'A', weight: 30, isComplete: (s) => s.a },
  { key: 'b', label: 'B', weight: 70, isComplete: (s) => s.b },
];

describe('calculateCompletion', () => {
  it('reports 0% when nothing is complete', () => {
    const result = calculateCompletion(RULES, { a: false, b: false });

    expect(result.percentage).toBe(0);
    expect(result.completedWeight).toBe(0);
    expect(result.totalWeight).toBe(100);
    expect(result.missing).toHaveLength(2);
  });

  it('reports 100% when everything is complete', () => {
    const result = calculateCompletion(RULES, { a: true, b: true });

    expect(result.percentage).toBe(100);
    expect(result.missing).toEqual([]);
  });

  it('weights partial completion', () => {
    expect(calculateCompletion(RULES, { a: true, b: false }).percentage).toBe(30);
    expect(calculateCompletion(RULES, { a: false, b: true }).percentage).toBe(70);
  });

  it('rounds to the nearest whole percent', () => {
    const rules: readonly CompletionRule<Subject>[] = [
      { key: 'a', label: 'A', weight: 1, isComplete: (s) => s.a },
      { key: 'b', label: 'B', weight: 2, isComplete: (s) => s.b },
    ];

    expect(calculateCompletion(rules, { a: true, b: false }).percentage).toBe(33);
  });

  it('returns 0% instead of dividing by zero when there are no rules', () => {
    expect(calculateCompletion([], { a: true, b: true }).percentage).toBe(0);
  });

  it('lists every rule with its outcome', () => {
    const result = calculateCompletion(RULES, { a: true, b: false });

    expect(result.items).toEqual([
      { key: 'a', label: 'A', weight: 30, isComplete: true },
      { key: 'b', label: 'B', weight: 70, isComplete: false },
    ]);
    expect(result.missing.map((item) => item.key)).toEqual(['b']);
  });
});

describe('hasEntries', () => {
  it('is true only for a non-empty list', () => {
    expect(hasEntries(['a'])).toBe(true);
    expect(hasEntries([])).toBe(false);
    expect(hasEntries(undefined)).toBe(false);
  });
});

describe('isFilled', () => {
  it.each([
    [undefined, false],
    [null, false],
    ['', false],
    ['   ', false],
    ['value', true],
    [0, true],
    [new Date(), true],
    [{ a: 1 }, true],
  ])('treats %s as %s', (value, expected) => {
    expect(isFilled(value)).toBe(expected);
  });
});
