import { z } from 'zod';

import {
  APPLICATION_STATUS_VALUES,
  PAGINATION,
  VALIDATION_LIMITS,
} from '../../config/constants';
import { objectIdSchema, optionalField } from '../../common/validation/fields';
import { jobResponseSchema } from '../job/job.schema';

/**
 * Applying carries almost nothing: the resume is snapshotted server-side from the
 * candidate's profile, so it cannot be pointed at someone else's file.
 */
export const applySchema = z.object({
  coverNote: optionalField(z.string().trim().max(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH)),
});
export type ApplyInput = z.infer<typeof applySchema>;

export const applicationStatusSchema = z.object({
  status: z.enum(APPLICATION_STATUS_VALUES),
});
export type ApplicationStatusInput = z.infer<typeof applicationStatusSchema>;

export const applicationIdParamsSchema = z.object({ id: objectIdSchema });
export type ApplicationIdParams = z.infer<typeof applicationIdParamsSchema>;

const pagingFields = {
  page: z.coerce.number().int().positive().default(PAGINATION.DEFAULT_PAGE),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(PAGINATION.MAX_PAGE_SIZE, `Page size cannot exceed ${PAGINATION.MAX_PAGE_SIZE}`)
    .default(PAGINATION.DEFAULT_PAGE_SIZE),
  status: z.enum(APPLICATION_STATUS_VALUES).optional(),
};

/** The candidate's own applications. */
export const myApplicationQuerySchema = z.object(pagingFields);
export type MyApplicationQueryInput = z.infer<typeof myApplicationQuerySchema>;

/** The employer's applicant list for one job. */
export const jobApplicantQuerySchema = z.object(pagingFields);
export type JobApplicantQueryInput = z.infer<typeof jobApplicantQuerySchema>;

/* -------------------------------------------------------------------------- */
/* Responses                                                                  */
/* -------------------------------------------------------------------------- */

const baseApplicationSchema = z.object({
  id: z.string(),
  status: z.enum(APPLICATION_STATUS_VALUES),
  coverNote: z.string().optional(),
  resumeFileId: z.string().optional(),
  statusUpdatedAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

/** What a candidate sees: their application plus the listing it was for. */
export const myApplicationResponseSchema = baseApplicationSchema.extend({
  job: jobResponseSchema,
});
export type MyApplicationResponse = z.infer<typeof myApplicationResponseSchema>;

/** What an employer sees: the application plus who sent it. */
export const applicantResponseSchema = baseApplicationSchema.extend({
  candidate: z.object({
    userId: z.string(),
    fullName: z.string(),
    currentLocation: z.string().optional(),
    skills: z.array(z.string()),
    profilePicFileId: z.string().optional(),
  }),
});
export type ApplicantResponse = z.infer<typeof applicantResponseSchema>;
