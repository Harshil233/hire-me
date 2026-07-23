import { z } from 'zod';

import { APPLICATION_STATUS_VALUES, VALIDATION_LIMITS } from '@/config/constants';
import { jobSchema, paginationSchema } from '@/features/jobs/schemas/job.schema';

/* -------------------------------------------------------------------------- */
/* Server contract                                                            */
/* -------------------------------------------------------------------------- */

const baseApplicationSchema = z.object({
  id: z.string(),
  status: z.enum(APPLICATION_STATUS_VALUES),
  coverNote: z.string().optional(),
  resumeFileId: z.string().optional(),
  statusUpdatedAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** The candidate's view: their application and the listing it was for. */
export const myApplicationSchema = baseApplicationSchema.extend({ job: jobSchema });
export type MyApplication = z.infer<typeof myApplicationSchema>;

/** The employer's view: the application and the applicant card. */
export const applicantSchema = baseApplicationSchema.extend({
  candidate: z.object({
    userId: z.string(),
    fullName: z.string(),
    currentLocation: z.string().optional(),
    skills: z.array(z.string()),
    profilePicFileId: z.string().optional(),
  }),
});
export type Applicant = z.infer<typeof applicantSchema>;

export const myApplicationListSchema = z.object({
  applications: z.array(myApplicationSchema),
  pagination: paginationSchema,
});
export type MyApplicationList = z.infer<typeof myApplicationListSchema>;

export const applicantListSchema = z.object({
  applications: z.array(applicantSchema),
  pagination: paginationSchema,
});
export type ApplicantList = z.infer<typeof applicantListSchema>;

export const applicationDetailSchema = z.object({ application: myApplicationSchema });

/** Which listings the signed-in candidate has already applied to. */
export const appliedJobIdsSchema = z.object({ jobIds: z.array(z.string()) });

export const applicationStatusResultSchema = z.object({
  application: z.object({ id: z.string(), status: z.enum(APPLICATION_STATUS_VALUES) }),
});

/* -------------------------------------------------------------------------- */
/* Filters and forms                                                          */
/* -------------------------------------------------------------------------- */

export type ApplicationFilters = {
  readonly page?: number | undefined;
  readonly status?: string | undefined;
};

export const applyFormSchema = z.object({
  coverNote: z
    .string()
    .trim()
    .max(
      VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH,
      `Keep this under ${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH} characters`,
    ),
});
export type ApplyFormValues = z.infer<typeof applyFormSchema>;
