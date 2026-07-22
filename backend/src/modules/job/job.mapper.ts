import type { JobWithCompany } from './job.interface';
import type { JobResponse } from './job.schema';

/** Domain → HTTP response. The wire shape for a job is defined here only. */
export const toJobResponse = (job: JobWithCompany): JobResponse => ({
  id: job.id,
  title: job.title,
  description: job.description,
  role: job.role,
  jobType: job.jobType,
  workMode: job.workMode,
  skills: [...job.skills],
  locations: [...job.locations],
  ctcMin: job.ctcMin,
  ctcMax: job.ctcMax,
  experienceMinYears: job.experienceMinYears,
  experienceMaxYears: job.experienceMaxYears,
  status: job.status,
  publishedAt: job.publishedAt?.toISOString(),
  closedAt: job.closedAt?.toISOString(),
  company: {
    id: job.company.id,
    name: job.company.name,
    slug: job.company.slug,
    logoFileId: job.company.logoFileId,
  },
  createdAt: job.createdAt.toISOString(),
  updatedAt: job.updatedAt.toISOString(),
});
