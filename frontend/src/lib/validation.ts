import { z } from 'zod';

import { VALIDATION_LIMITS } from '@/config/constants';

/**
 * Form-side field rules. They mirror the API contract so a user sees the problem before
 * a round trip; the server remains the authority (CLAUDE.md §1 — the apps stay
 * independent, so the rules are duplicated rather than imported).
 *
 * Every field is modelled the way an HTML control actually behaves: text controls yield
 * `''` when empty, never `undefined`.
 */

export const emailField = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(254, 'Email is too long')
  .pipe(z.email('Enter a valid email address'));

export const passwordField = z
  .string()
  .min(
    VALIDATION_LIMITS.PASSWORD_MIN_LENGTH,
    `Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN_LENGTH} characters`,
  )
  .max(VALIDATION_LIMITS.PASSWORD_MAX_LENGTH, 'Password is too long')
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/\d/, 'Add a number')
  .regex(/[^A-Za-z0-9]/, 'Add a symbol');

export const requiredTextField = (
  label: string,
  maxLength: number = VALIDATION_LIMITS.SHORT_TEXT_MAX_LENGTH,
): z.ZodString =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(maxLength, `${label} must be at most ${maxLength} characters`);

export const optionalTextField = (
  maxLength: number = VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH,
): z.ZodString => z.string().trim().max(maxLength, `Keep this under ${maxLength} characters`);

/** Optional URL: empty is fine, anything else must be a real http(s) address. */
export const optionalUrlField = (label = 'URL'): z.ZodString =>
  z
    .string()
    .trim()
    .refine(
      (value) => value === '' || /^https?:\/\/\S+\.\S+/.test(value),
      `Enter a valid ${label} starting with http:// or https://`,
    );

export const optionalHostedUrlField = (hosts: readonly string[], label: string): z.ZodString =>
  optionalUrlField(label).refine((value) => {
    if (value === '') {
      return true;
    }
    try {
      const { hostname } = new URL(value);
      return hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
    } catch {
      return false;
    }
  }, `Enter a valid ${label} link`);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const requiredDateField = (label: string): z.ZodString =>
  z.string().min(1, `${label} is required`).regex(ISO_DATE, `Enter a valid ${label.toLowerCase()}`);

export const optionalDateField = (label = 'date'): z.ZodString =>
  z.string().refine((value) => value === '' || ISO_DATE.test(value), `Enter a valid ${label}`);

/** A date that must not be in the future — used for start dates and issue dates. */
export const pastDateField = (label: string): z.ZodString =>
  requiredDateField(label).refine(
    (value) => new Date(`${value}T00:00:00.000Z`).getTime() <= Date.now(),
    `${label} cannot be in the future`,
  );

const yearsSince = (isoDate: string): number =>
  (Date.now() - new Date(`${isoDate}T00:00:00.000Z`).getTime()) / (365.2425 * 86_400_000);

export const optionalDobField = (): z.ZodString =>
  optionalDateField('date of birth').refine((value) => {
    if (value === '') {
      return true;
    }
    const age = yearsSince(value);
    return age >= VALIDATION_LIMITS.MIN_AGE_YEARS && age <= VALIDATION_LIMITS.MAX_AGE_YEARS;
  }, `You must be between ${VALIDATION_LIMITS.MIN_AGE_YEARS} and ${VALIDATION_LIMITS.MAX_AGE_YEARS} years old`);

export const countryCodeField = z
  .string()
  .trim()
  .regex(/^\+\d{1,3}$/, 'Use a code like +91');

export const mobileNumberField = z
  .string()
  .trim()
  .regex(/^\d{7,15}$/, 'Enter 7 to 15 digits');

/** Salary entered as text; `''` means "not provided". */
export const optionalAmountField = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\d+$/.test(value), 'Enter a whole number')
  .refine(
    (value) => value === '' || Number(value) <= VALIDATION_LIMITS.MAX_CTC,
    'That amount looks unrealistic',
  );

// The concrete `ZodArray` type is kept rather than the wider `ZodType<string[]>`:
// erasing it loses the input type, which react-hook-form's resolver needs.
export const chipsField = (label: string): z.ZodArray<z.ZodString> =>
  z
    .array(z.string().trim().min(1).max(VALIDATION_LIMITS.LIST_ITEM_MAX_LENGTH))
    .max(
      VALIDATION_LIMITS.LIST_MAX_ITEMS,
      `${label} cannot contain more than ${VALIDATION_LIMITS.LIST_MAX_ITEMS} entries`,
    );

/** Shared cross-field rule for every dated form (mirrors the API rule). */
export const dateRangeRule =
  (startField: string, endField: string, currentField?: string) =>
  (value: Record<string, unknown>, ctx: z.RefinementCtx): void => {
    const start = value[startField];
    const end = value[endField];
    const isCurrent = currentField === undefined ? false : value[currentField] === true;

    if (typeof start !== 'string' || typeof end !== 'string' || end === '') {
      return;
    }

    if (isCurrent) {
      ctx.addIssue({
        code: 'custom',
        path: [endField],
        message: 'Leave the end date empty while this is ongoing',
      });
      return;
    }

    if (new Date(end).getTime() <= new Date(start).getTime()) {
      ctx.addIssue({
        code: 'custom',
        path: [endField],
        message: 'End date must be after the start date',
      });
    }
  };

/** `''` → omitted from the payload; anything else is sent as-is. */
export const orUndefined = (value: string): string | undefined =>
  value.trim() === '' ? undefined : value.trim();

/** `''` → `null`, which the API treats as "clear this field". */
export const orNull = (value: string): string | null => (value.trim() === '' ? null : value.trim());
