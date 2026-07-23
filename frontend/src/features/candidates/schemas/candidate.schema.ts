import { z } from 'zod';

import { JOB_TYPE_VALUES } from '@/config/constants';
import { paginationSchema } from '@/features/jobs/schemas/job.schema';

/** The talent-pool card. Deliberately narrow — the API sends nothing more than this. */
export const candidateSchema = z.object({
  userId: z.string(),
  fullName: z.string(),
  currentLocation: z.string().optional(),
  preferredLocations: z.array(z.string()),
  skills: z.array(z.string()),
  jobTypes: z.array(z.enum(JOB_TYPE_VALUES)),
  profilePicFileId: z.string().optional(),
  resumeFileId: z.string().optional(),
});
export type Candidate = z.infer<typeof candidateSchema>;

export const candidateListSchema = z.object({
  candidates: z.array(candidateSchema),
  pagination: paginationSchema,
});
export type CandidateList = z.infer<typeof candidateListSchema>;

export type CandidateFilters = {
  readonly page?: number | undefined;
  readonly search?: string | undefined;
  readonly skills?: string | undefined;
  readonly location?: string | undefined;
  readonly jobType?: string | undefined;
};
