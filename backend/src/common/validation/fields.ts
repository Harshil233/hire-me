import { z } from 'zod';

import { GENDER_VALUES, VALIDATION_LIMITS } from '../../config/constants';

/**
 * Reusable Zod field builders. Every module schema composes these instead of
 * re-declaring the same rules (CLAUDE.md §9).
 */

const { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, NAME_MAX_LENGTH, EMAIL_MAX_LENGTH } =
  VALIDATION_LIMITS;

export const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export const objectIdSchema = z
  .string()
  .regex(OBJECT_ID_PATTERN, 'Must be a valid identifier');

export const emailSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.email('Enter a valid email address').max(EMAIL_MAX_LENGTH),
);

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`)
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/\d/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a symbol');

/** Required, trimmed, human-name-sized text. */
export const requiredName = (label: string): z.ZodString =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(NAME_MAX_LENGTH, `${label} must be at most ${NAME_MAX_LENGTH} characters`);

/** Required, trimmed short text such as a job title or city. */
export const requiredText = (
  label: string,
  maxLength: number = VALIDATION_LIMITS.SHORT_TEXT_MAX_LENGTH,
): z.ZodString =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(maxLength, `${label} must be at most ${maxLength} characters`);

/**
 * Makes a field optional and treats `""` / `null` as "not provided", which is what a
 * cleared HTML form control sends. Without this every optional URL, date and enum
 * would need the same guard repeated in each schema.
 */
// The return type is inferred on purpose: annotating it erases Zod's "this key is
// optional" marker and every optional field would become a required `T | undefined`.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const optionalField = <TSchema extends z.ZodType>(schema: TSchema) =>
  z.preprocess((value) => (value === '' || value === null ? undefined : value), schema.optional());

/**
 * Partial-update field: omitted means "leave unchanged", `null` (or `""`) means
 * "clear this value". Used by the profile schemas where each card saves on its own.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const clearableField = <TSchema extends z.ZodType>(schema: TSchema) =>
  z.preprocess((value) => (value === '' ? null : value), schema.nullable().optional());

export const mobileSchema = z.object({
  countryCode: z
    .string()
    .trim()
    .regex(/^\+\d{1,3}$/, 'Country code must look like +91'),
  number: z
    .string()
    .trim()
    .regex(
      new RegExp(
        `^\\d{${VALIDATION_LIMITS.MOBILE_MIN_DIGITS},${VALIDATION_LIMITS.MOBILE_MAX_DIGITS}}$`,
      ),
      `Mobile number must be ${VALIDATION_LIMITS.MOBILE_MIN_DIGITS}–${VALIDATION_LIMITS.MOBILE_MAX_DIGITS} digits`,
    ),
});
export type MobileInput = z.infer<typeof mobileSchema>;

export const genderSchema = z.enum(GENDER_VALUES);

/** `YYYY-MM-DD` in, UTC `Date` out. */
export const isoDateSchema = z.iso
  .date('Enter a valid date in YYYY-MM-DD format')
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const yearsBetween = (from: Date, to: Date): number => {
  const millisecondsPerYear = 365.2425 * 24 * 60 * 60 * 1000;
  return (to.getTime() - from.getTime()) / millisecondsPerYear;
};

/** Date of birth: in the past and inside the allowed age window. */
export const dobSchema = isoDateSchema.refine(
  (date) => {
    const age = yearsBetween(date, new Date());
    return age >= VALIDATION_LIMITS.MIN_AGE_YEARS && age <= VALIDATION_LIMITS.MAX_AGE_YEARS;
  },
  `You must be between ${VALIDATION_LIMITS.MIN_AGE_YEARS} and ${VALIDATION_LIMITS.MAX_AGE_YEARS} years old`,
);

/** A date that may not be in the future (start of a job, issue date of a certificate). */
export const pastDateSchema = isoDateSchema.refine(
  (date) => date.getTime() <= Date.now(),
  'Date cannot be in the future',
);

export const urlSchema = z
  .url('Enter a valid URL')
  .max(VALIDATION_LIMITS.ADDRESS_MAX_LENGTH)
  .refine((value) => /^https?:\/\//i.test(value), 'URL must start with http:// or https://');

/** URL restricted to a known set of hosts, e.g. LinkedIn or Instagram profile links. */
export const hostedUrlSchema = (hosts: readonly string[], label: string): z.ZodType<string> =>
  urlSchema.refine((value) => {
    const { hostname } = new URL(value);
    return hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  }, `Enter a valid ${label} URL`);

/**
 * Trimmed, de-duplicated (case-insensitive), bounded list of short strings —
 * used for skills, locations and preferred locations.
 */
export const stringListSchema = (
  label: string,
  maxItems: number = VALIDATION_LIMITS.LIST_MAX_ITEMS,
  maxItemLength: number = VALIDATION_LIMITS.LIST_ITEM_MAX_LENGTH,
): z.ZodType<string[]> =>
  z
    .array(z.string().trim().min(1).max(maxItemLength))
    .max(maxItems, `${label} cannot contain more than ${maxItems} entries`)
    .transform((items) => {
      const seen = new Set<string>();
      return items.filter((item) => {
        const key = item.toLowerCase();
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    });

export const ctcSchema = z
  .number()
  .int('Amount must be a whole number')
  .min(0, 'Amount cannot be negative')
  .max(VALIDATION_LIMITS.MAX_CTC, 'Amount is unrealistically large');

export interface DateRangeFields {
  readonly startField?: string;
  readonly endField?: string;
  readonly currentField?: string;
}

/**
 * Shared cross-field rule for every dated section (experience, education, certification,
 * project): the end date must follow the start date and cannot coexist with an
 * "ongoing" flag. Field names are configurable so certifications can reuse it for
 * `issuedOn` / `expiresOn`.
 */
export const createDateRangeRule =
  ({
    startField = 'startDate',
    endField = 'endDate',
    currentField = 'isCurrent',
  }: DateRangeFields = {}) =>
  (value: Readonly<Record<string, unknown>>, ctx: z.RefinementCtx): void => {
    const start = value[startField];
    const end = value[endField];
    const isCurrent = value[currentField];

    if (isCurrent === true && end instanceof Date) {
      ctx.addIssue({
        code: 'custom',
        path: [endField],
        message: 'Leave the end date empty while this is ongoing',
      });
      return;
    }

    if (start instanceof Date && end instanceof Date && end.getTime() <= start.getTime()) {
      ctx.addIssue({
        code: 'custom',
        path: [endField],
        message: 'End date must be after the start date',
      });
    }
  };
