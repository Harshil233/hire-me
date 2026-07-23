import { z } from 'zod';

import {
  JOB_ROLE_VALUES,
  JOB_STATUS_VALUES,
  JOB_TYPE_VALUES,
  VALIDATION_LIMITS,
  WORK_MODE_VALUES,
} from '@/config/constants';
import { requiredTextField } from '@/lib/validation';

/* -------------------------------------------------------------------------- */
/* Server contract                                                            */
/* -------------------------------------------------------------------------- */

export const jobCompanySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logoFileId: z.string().optional(),
  websiteUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
});

export const jobSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  highlights: z.array(z.string()),
  responsibilities: z.array(z.string()),
  qualifications: z.array(z.string()),
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
  publishedAt: z.string().optional(),
  closedAt: z.string().optional(),
  company: jobCompanySchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Job = z.infer<typeof jobSchema>;

export const paginationSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
});
export type Pagination = z.infer<typeof paginationSchema>;

export const jobListSchema = z.object({
  jobs: z.array(jobSchema),
  pagination: paginationSchema,
});
export type JobList = z.infer<typeof jobListSchema>;

export const jobDetailSchema = z.object({ job: jobSchema });

/* -------------------------------------------------------------------------- */
/* Filters                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Everything the browse screen can narrow by. All optional; all serialised as strings.
 * A type alias rather than an interface so it satisfies the `Record<string, unknown>`
 * that react-query's key builders take.
 */
export type JobFilters = {
  readonly page?: number | undefined;
  /** Only set where a caller wants a short list, such as the similar-jobs strip. */
  readonly pageSize?: number | undefined;
  readonly search?: string | undefined;
  readonly role?: string | undefined;
  readonly jobType?: string | undefined;
  readonly workMode?: string | undefined;
  readonly location?: string | undefined;
  readonly minCtc?: string | undefined;
  readonly maxExperienceYears?: string | undefined;
  readonly status?: string | undefined;
};

/* -------------------------------------------------------------------------- */
/* Posting form                                                               */
/* -------------------------------------------------------------------------- */

/** Numeric inputs arrive as strings from the DOM; `''` means "not specified". */
const optionalNumberField = z
  .string()
  .trim()
  .refine((value) => value === '' || /^\d+$/.test(value), 'Enter a whole number');

export const jobFormSchema = z
  .object({
    title: requiredTextField('Title', VALIDATION_LIMITS.SHORT_TEXT_MAX_LENGTH),
    description: requiredTextField('Description', VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH),
    role: z.enum(JOB_ROLE_VALUES),
    jobType: z.enum(JOB_TYPE_VALUES),
    workMode: z.enum(WORK_MODE_VALUES),
    skills: z.array(z.string()),
    locations: z.array(z.string()),
    ctcMin: optionalNumberField,
    ctcMax: optionalNumberField,
    experienceMinYears: optionalNumberField,
    experienceMaxYears: optionalNumberField,
  })
  .superRefine((value, ctx) => {
    // Mirrors the server's range rule so the user is told before the round trip.
    const pairs = [
      { min: value.ctcMin, max: value.ctcMax, field: 'ctcMax', label: 'CTC' },
      {
        min: value.experienceMinYears,
        max: value.experienceMaxYears,
        field: 'experienceMaxYears',
        label: 'experience',
      },
    ] as const;

    for (const pair of pairs) {
      if (pair.min !== '' && pair.max !== '' && Number(pair.max) < Number(pair.min)) {
        ctx.addIssue({
          code: 'custom',
          path: [pair.field],
          message: `Maximum ${pair.label} cannot be lower than the minimum`,
        });
      }
    }
  });
export type JobFormValues = z.infer<typeof jobFormSchema>;
