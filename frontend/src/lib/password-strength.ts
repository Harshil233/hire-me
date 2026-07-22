import { VALIDATION_LIMITS } from '@/config/constants';

export interface PasswordStrength {
  /** How many of the four policy rules the value satisfies. */
  readonly score: number;
  readonly maxScore: number;
  readonly label: string;
  readonly toneClass: string;
}

const RULES: readonly ((value: string) => boolean)[] = [
  (value) => value.length >= VALIDATION_LIMITS.PASSWORD_MIN_LENGTH,
  (value) => /[a-z]/.test(value) && /[A-Z]/.test(value),
  (value) => /\d/.test(value),
  (value) => /[^A-Za-z0-9]/.test(value),
];

/** Pure scoring, so the meter can be asserted without rendering a component. */
export const scorePassword = (value: string): PasswordStrength => {
  const score = RULES.filter((rule) => rule(value)).length;
  const base = { score, maxScore: RULES.length };

  if (value === '') {
    return { ...base, score: 0, label: '', toneClass: 'bg-slate-200' };
  }
  if (score <= 1) {
    return { ...base, label: 'Weak', toneClass: 'bg-red-500' };
  }
  if (score <= 3) {
    return { ...base, label: 'Fair', toneClass: 'bg-amber-500' };
  }
  return { ...base, label: 'Strong', toneClass: 'bg-emerald-500' };
};
