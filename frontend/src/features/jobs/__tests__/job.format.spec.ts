import { describe, expect, it } from 'vitest';

import { formatCtcRange, formatExperienceRange } from '../utils/job.format';

describe('formatCtcRange', () => {
  it('renders both bounds as a range', () => {
    const formatted = formatCtcRange(1_800_000, 2_800_000);

    expect(formatted).toContain('–');
    expect(formatted).toContain('₹');
  });

  it('renders an open top as "From"', () => {
    expect(formatCtcRange(1_800_000, undefined)).toMatch(/^From ₹/);
  });

  it('renders an open bottom as "Up to"', () => {
    expect(formatCtcRange(undefined, 2_800_000)).toMatch(/^Up to ₹/);
  });

  it('returns an empty string when pay is not disclosed', () => {
    expect(formatCtcRange(undefined, undefined)).toBe('');
  });

  it('treats zero as a real bound rather than as missing', () => {
    expect(formatCtcRange(0, undefined)).toMatch(/^From ₹/);
  });
});

describe('formatExperienceRange', () => {
  it('renders a range', () => {
    expect(formatExperienceRange(4, 8)).toBe('4 – 8 yrs');
  });

  it('collapses equal bounds to a single figure', () => {
    expect(formatExperienceRange(5, 5)).toBe('5 yrs');
  });

  it('uses the singular for one year', () => {
    expect(formatExperienceRange(1, 1)).toBe('1 yr');
  });

  it('renders an open top with a plus', () => {
    expect(formatExperienceRange(4, undefined)).toBe('4 yrs+');
  });

  it('renders an open bottom as "Up to"', () => {
    expect(formatExperienceRange(undefined, 3)).toBe('Up to 3 yrs');
  });

  it('returns an empty string when no requirement is stated', () => {
    expect(formatExperienceRange(undefined, undefined)).toBe('');
  });

  it('treats a zero floor as stated, not missing', () => {
    expect(formatExperienceRange(0, undefined)).toBe('0 yrs+');
  });
});
