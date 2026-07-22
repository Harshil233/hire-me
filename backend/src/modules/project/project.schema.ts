import { z } from 'zod';

import { VALIDATION_LIMITS } from '../../config/constants';
import {
  createDateRangeRule,
  isoDateSchema,
  optionalField,
  pastDateSchema,
  requiredText,
  stringListSchema,
  urlSchema,
} from '../../common/validation/fields';

const projectObjectSchema = z.object({
  title: requiredText('Project title'),
  description: optionalField(z.string().trim().max(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH)),
  skills: stringListSchema('Skills').default([]),
  domain: optionalField(requiredText('Domain')),
  link: optionalField(urlSchema),
  startDate: pastDateSchema,
  endDate: optionalField(isoDateSchema),
  isCurrent: z.boolean().default(false),
});

export const projectInputSchema = projectObjectSchema.superRefine(createDateRangeRule());
export type ProjectInput = z.infer<typeof projectInputSchema>;

export const PROJECT_FIELDS = Object.keys(projectObjectSchema.shape);

export const projectResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  skills: z.array(z.string()),
  domain: z.string().optional(),
  link: z.string().optional(),
  startDate: z.iso.datetime(),
  endDate: z.iso.datetime().optional(),
  isCurrent: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type ProjectResponse = z.infer<typeof projectResponseSchema>;
