import { z } from 'zod';

import { JOB_TYPE_VALUES, PAGINATION, VALIDATION_LIMITS } from '../../config/constants';
import {
  clearableField,
  ctcSchema,
  dobSchema,
  genderSchema,
  mobileSchema,
  objectIdSchema,
  requiredName,
  requiredText,
  stringListSchema,
} from '../../common/validation/fields';

/**
 * Partial update: omitted keys stay as they are, `null` clears a value.
 * Each profile card on the frontend submits only its own fields.
 */
export const updateCandidateProfileSchema = z
  .object({
    firstName: requiredName('First name').optional(),
    middleName: clearableField(requiredName('Middle name')),
    lastName: requiredName('Last name').optional(),
    profilePicFileId: clearableField(objectIdSchema),
    mobile: clearableField(mobileSchema),
    gender: clearableField(genderSchema),
    dob: clearableField(dobSchema),
    currentLocation: clearableField(requiredText('Current location')),
    preferredLocations: stringListSchema('Preferred locations').optional(),
    skills: stringListSchema('Skills').optional(),
    jobTypes: z
      .array(z.enum(JOB_TYPE_VALUES))
      .max(JOB_TYPE_VALUES.length, 'Too many job types selected')
      .optional(),
    currentCtc: clearableField(ctcSchema),
    expectedCtc: clearableField(ctcSchema),
    resumeFileId: clearableField(objectIdSchema),
  })
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');
export type UpdateCandidateProfileInput = z.infer<typeof updateCandidateProfileSchema>;

export const mobileResponseSchema = z.object({
  countryCode: z.string(),
  number: z.string(),
});

export const candidateProfileResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  firstName: z.string(),
  middleName: z.string().optional(),
  lastName: z.string(),
  profilePicFileId: z.string().optional(),
  mobile: mobileResponseSchema.optional(),
  gender: genderSchema.optional(),
  dob: z.iso.datetime().optional(),
  currentLocation: z.string().optional(),
  preferredLocations: z.array(z.string()),
  skills: z.array(z.string()),
  jobTypes: z.array(z.enum(JOB_TYPE_VALUES)),
  currentCtc: z.number().optional(),
  expectedCtc: z.number().optional(),
  currency: z.string(),
  resumeFileId: z.string().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type CandidateProfileResponse = z.infer<typeof candidateProfileResponseSchema>;

/** Names captured at sign-up; the rest of the profile starts empty. */
export const createCandidateProfileSchema = z.object({
  firstName: requiredName('First name'),
  middleName: requiredName('Middle name').optional(),
  lastName: requiredName('Last name'),
});
export type CreateCandidateProfileInput = z.infer<typeof createCandidateProfileSchema>;

/**
 * Employer-facing talent pool filters. Every value is coerced and bounded here, so the
 * repository only ever sees whitelisted scalars.
 */
export const candidateQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(PAGINATION.DEFAULT_PAGE),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(PAGINATION.MAX_PAGE_SIZE, `Page size cannot exceed ${PAGINATION.MAX_PAGE_SIZE}`)
    .default(PAGINATION.DEFAULT_PAGE_SIZE),
  /** Matches a name, a skill or a location. */
  search: z.string().trim().min(1).max(VALIDATION_LIMITS.SHORT_TEXT_MAX_LENGTH).optional(),
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
  location: z.string().trim().min(1).max(VALIDATION_LIMITS.LIST_ITEM_MAX_LENGTH).optional(),
  jobType: z.enum(JOB_TYPE_VALUES).optional(),
});
export type CandidateQueryInput = z.infer<typeof candidateQuerySchema>;

export const candidateBrowseItemResponseSchema = z.object({
  userId: z.string(),
  fullName: z.string(),
  currentLocation: z.string().optional(),
  preferredLocations: z.array(z.string()),
  skills: z.array(z.string()),
  jobTypes: z.array(z.enum(JOB_TYPE_VALUES)),
  profilePicFileId: z.string().optional(),
  resumeFileId: z.string().optional(),
});
export type CandidateBrowseItemResponse = z.infer<typeof candidateBrowseItemResponseSchema>;
