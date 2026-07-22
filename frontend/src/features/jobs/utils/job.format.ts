import { CTC_CURRENCY } from '@/config/constants';

/** Presentation helpers for a job's two open-ended ranges. Pure, so unit-tested alone. */

const COMPACT_CURRENCY = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: CTC_CURRENCY,
  notation: 'compact',
  maximumFractionDigits: 1,
});

const amount = (value: number): string => COMPACT_CURRENCY.format(value);

/**
 * `₹18L – ₹28L` when both bounds are set, `From ₹18L` / `Up to ₹28L` when only one is,
 * and an empty string when the posting does not disclose pay.
 */
export const formatCtcRange = (min?: number, max?: number): string => {
  if (min !== undefined && max !== undefined) {
    return `${amount(min)} – ${amount(max)}`;
  }
  if (min !== undefined) {
    return `From ${amount(min)}`;
  }
  if (max !== undefined) {
    return `Up to ${amount(max)}`;
  }
  return '';
};

const years = (value: number): string => `${value} ${value === 1 ? 'yr' : 'yrs'}`;

export const formatExperienceRange = (min?: number, max?: number): string => {
  if (min !== undefined && max !== undefined) {
    return min === max ? years(min) : `${min} – ${years(max)}`;
  }
  if (min !== undefined) {
    return `${years(min)}+`;
  }
  if (max !== undefined) {
    return `Up to ${years(max)}`;
  }
  return '';
};
