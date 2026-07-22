import { z } from 'zod';

import { VALIDATION_LIMITS } from '../../config/constants';
import {
  createDateRangeRule,
  isoDateSchema,
  optionalField,
  pastDateSchema,
  requiredText,
} from '../../common/validation/fields';

const educationObjectSchema = z.object({
  college: requiredText('College or university'),
  course: requiredText('Course'),
  degree: requiredText('Degree'),
  description: optionalField(z.string().trim().max(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH)),
  startDate: pastDateSchema,
  endDate: optionalField(isoDateSchema),
  isCurrent: z.boolean().default(false),
});

export const educationInputSchema = educationObjectSchema.superRefine(createDateRangeRule());
export type EducationInput = z.infer<typeof educationInputSchema>;

export const EDUCATION_FIELDS = Object.keys(educationObjectSchema.shape);

export const educationResponseSchema = z.object({
  id: z.string(),
  college: z.string(),
  course: z.string(),
  degree: z.string(),
  description: z.string().optional(),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().optional(),
  isCurrent: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type EducationResponse = z.infer<typeof educationResponseSchema>;
