import { z } from 'zod';

import { VALIDATION_LIMITS } from '../../config/constants';
import {
  createDateRangeRule,
  isoDateSchema,
  optionalField,
  pastDateSchema,
  requiredText,
  stringListSchema,
} from '../../common/validation/fields';

const experienceObjectSchema = z.object({
  title: requiredText('Job title'),
  companyName: requiredText('Company name'),
  description: optionalField(z.string().trim().max(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH)),
  startDate: pastDateSchema,
  endDate: optionalField(isoDateSchema),
  isCurrent: z.boolean().default(false),
  skills: stringListSchema('Skills').default([]),
});

/** Same schema for create and update — sections are saved as a whole. */
export const experienceInputSchema = experienceObjectSchema.superRefine(createDateRangeRule());
export type ExperienceInput = z.infer<typeof experienceInputSchema>;

/** Field list the repository is allowed to write (drives PUT replace semantics). */
export const EXPERIENCE_FIELDS = Object.keys(experienceObjectSchema.shape);

export const experienceResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  companyName: z.string(),
  description: z.string().optional(),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().optional(),
  isCurrent: z.boolean(),
  skills: z.array(z.string()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type ExperienceResponse = z.infer<typeof experienceResponseSchema>;
