import { z } from 'zod';

import { JOB_TYPE_VALUES } from '@/config/constants';
import { paginationSchema } from '@/features/jobs/schemas/job.schema';
import { certificationItemSchema } from '@/features/sections/configs/certification.config';
import { educationItemSchema } from '@/features/sections/configs/education.config';
import { experienceItemSchema } from '@/features/sections/configs/experience.config';
import { projectItemSchema } from '@/features/sections/configs/project.config';

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

/**
 * A candidate opened from the pool: the card plus the sections they filled in. The item
 * schemas are the section configs' own, so the employer's read-only view and the
 * candidate's editable one parse identically (CLAUDE.md §9).
 */
export const candidateDetailSchema = candidateSchema.extend({
  experience: z.array(experienceItemSchema),
  education: z.array(educationItemSchema),
  projects: z.array(projectItemSchema),
  certifications: z.array(certificationItemSchema),
});
export type CandidateDetail = z.infer<typeof candidateDetailSchema>;

export const candidateDetailResponseSchema = z.object({ candidate: candidateDetailSchema });

export type CandidateFilters = {
  readonly page?: number | undefined;
  readonly search?: string | undefined;
  readonly skills?: string | undefined;
  readonly location?: string | undefined;
  readonly jobType?: string | undefined;
};
