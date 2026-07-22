import { z } from 'zod';

import {
  JOB_ROLE_VALUES,
  JOB_STATUS_VALUES,
  JOB_TYPE_VALUES,
  PAGINATION,
  VALIDATION_LIMITS,
  WORK_MODE_VALUES,
} from '../../config/constants';
import {
  createNumericRangeRule,
  ctcSchema,
  objectIdSchema,
  optionalField,
  requiredText,
  stringListSchema,
} from '../../common/validation/fields';
import { companyResponseSchema } from '../company/company.schema';

const experienceYearsSchema = z
  .number()
  .int('Experience must be a whole number of years')
  .min(0, 'Experience cannot be negative')
  .max(VALIDATION_LIMITS.MAX_EXPERIENCE_YEARS, 'Experience is unrealistically high');

/**
 * Field rules declared once. `companyId` is deliberately absent: it is resolved from the
 * poster's own membership, never accepted from the client.
 */
const jobFields = {
  title: requiredText('Title'),
  description: requiredText('Description', VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH),
  role: z.enum(JOB_ROLE_VALUES),
  jobType: z.enum(JOB_TYPE_VALUES),
  workMode: z.enum(WORK_MODE_VALUES),
  skills: stringListSchema('Skills'),
  locations: stringListSchema('Locations'),
  ctcMin: optionalField(ctcSchema),
  ctcMax: optionalField(ctcSchema),
  experienceMinYears: optionalField(experienceYearsSchema),
  experienceMaxYears: optionalField(experienceYearsSchema),
};

const ctcRangeRule = createNumericRangeRule({
  minField: 'ctcMin',
  maxField: 'ctcMax',
  label: 'CTC',
});

const experienceRangeRule = createNumericRangeRule({
  minField: 'experienceMinYears',
  maxField: 'experienceMaxYears',
  label: 'experience',
});

export const createJobSchema = z
  .object({
    ...jobFields,
    skills: stringListSchema('Skills').default([]),
    locations: stringListSchema('Locations').default([]),
  })
  .superRefine(ctcRangeRule)
  .superRefine(experienceRangeRule);
export type CreateJobInput = z.infer<typeof createJobSchema>;

export const updateJobSchema = z
  .object(jobFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update')
  .superRefine(ctcRangeRule)
  .superRefine(experienceRangeRule);
export type UpdateJobInput = z.infer<typeof updateJobSchema>;

export const jobStatusSchema = z.object({ status: z.enum(JOB_STATUS_VALUES) });
export type JobStatusInput = z.infer<typeof jobStatusSchema>;

export const jobIdParamsSchema = z.object({ id: objectIdSchema });
export type JobIdParams = z.infer<typeof jobIdParamsSchema>;

/**
 * Browse filters. Every value is coerced and bounded here, so the repository only ever
 * sees whitelisted scalars — an object such as `?role[$ne]=x` fails parsing with a 422
 * and never reaches Mongo.
 */
export const jobQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(PAGINATION.DEFAULT_PAGE),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(PAGINATION.MAX_PAGE_SIZE, `Page size cannot exceed ${PAGINATION.MAX_PAGE_SIZE}`)
    .default(PAGINATION.DEFAULT_PAGE_SIZE),
  search: z.string().trim().min(1).max(VALIDATION_LIMITS.SHORT_TEXT_MAX_LENGTH).optional(),
  role: z.enum(JOB_ROLE_VALUES).optional(),
  jobType: z.enum(JOB_TYPE_VALUES).optional(),
  workMode: z.enum(WORK_MODE_VALUES).optional(),
  location: z.string().trim().min(1).max(VALIDATION_LIMITS.LIST_ITEM_MAX_LENGTH).optional(),
  /** Comma-separated list; a job matches when it asks for any of them. */
  skills: z
    .string()
    .trim()
    .transform((value) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, VALIDATION_LIMITS.LIST_MAX_ITEMS),
    )
    .optional(),
  /** "Pays at least this much" — matched against the job's upper bound. */
  minCtc: z.coerce.number().int().min(0).max(VALIDATION_LIMITS.MAX_CTC).optional(),
  /** "I have this many years" — matched against the job's lower bound. */
  maxExperienceYears: z.coerce
    .number()
    .int()
    .min(0)
    .max(VALIDATION_LIMITS.MAX_EXPERIENCE_YEARS)
    .optional(),
});
export type JobQueryInput = z.infer<typeof jobQuerySchema>;

/** HR's own postings, where drafts and closed listings are visible too. */
export const hrJobQuerySchema = jobQuerySchema.extend({
  status: z.enum(JOB_STATUS_VALUES).optional(),
});
export type HrJobQueryInput = z.infer<typeof hrJobQuerySchema>;

export const jobResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  role: z.enum(JOB_ROLE_VALUES),
  jobType: z.enum(JOB_TYPE_VALUES),
  workMode: z.enum(WORK_MODE_VALUES),
  skills: z.array(z.string()),
  locations: z.array(z.string()),
  ctcMin: z.number().optional(),
  ctcMax: z.number().optional(),
  experienceMinYears: z.number().optional(),
  experienceMaxYears: z.number().optional(),
  status: z.enum(JOB_STATUS_VALUES),
  publishedAt: z.iso.datetime().optional(),
  closedAt: z.iso.datetime().optional(),
  company: companyResponseSchema.pick({ id: true, name: true, slug: true, logoFileId: true }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type JobResponse = z.infer<typeof jobResponseSchema>;
