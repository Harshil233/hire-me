import type { AxiosInstance } from 'axios';

import { JOBS_PAGE_SIZE, type JobStatus } from '@/config/constants';
import { httpClient, request } from '@/services/api-client';
import {
  jobDetailSchema,
  jobListSchema,
  type Job,
  type JobFilters,
  type JobFormValues,
  type JobList,
} from '../schemas/job.schema';

/**
 * Feature API layer. Components never call axios directly; hooks consume this and tests
 * inject a stub client (CLAUDE.md §10).
 */
export interface IJobApi {
  browse(filters: JobFilters): Promise<JobList>;
  listMine(filters: JobFilters): Promise<JobList>;
  getById(id: string): Promise<Job>;
  create(values: JobFormValues): Promise<Job>;
  update(id: string, values: JobFormValues): Promise<Job>;
  changeStatus(id: string, status: JobStatus): Promise<Job>;
}

/** Blank filters are omitted so the URL carries only what the user actually chose. */
export const toQueryParams = (filters: JobFilters): Record<string, string> => {
  const params: Record<string, string> = { pageSize: String(JOBS_PAGE_SIZE) };

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && String(value).trim() !== '') {
      params[key] = String(value);
    }
  }

  return params;
};

/** Empty numeric strings become absent fields rather than zeroes. */
const toNumberOrUndefined = (value: string): number | undefined =>
  value.trim() === '' ? undefined : Number(value);

export const toJobPayload = (values: JobFormValues): Record<string, unknown> => ({
  title: values.title,
  description: values.description,
  role: values.role,
  jobType: values.jobType,
  workMode: values.workMode,
  skills: values.skills,
  locations: values.locations,
  ctcMin: toNumberOrUndefined(values.ctcMin),
  ctcMax: toNumberOrUndefined(values.ctcMax),
  experienceMinYears: toNumberOrUndefined(values.experienceMinYears),
  experienceMaxYears: toNumberOrUndefined(values.experienceMaxYears),
});

export const createJobApi = (client: AxiosInstance = httpClient): IJobApi => ({
  browse: (filters) =>
    request(client, { url: '/jobs', method: 'GET', params: toQueryParams(filters) }, jobListSchema),

  listMine: (filters) =>
    request(
      client,
      { url: '/jobs/mine', method: 'GET', params: toQueryParams(filters) },
      jobListSchema,
    ),

  getById: async (id) =>
    (await request(client, { url: `/jobs/${id}`, method: 'GET' }, jobDetailSchema)).job,

  create: async (values) =>
    (
      await request(
        client,
        { url: '/jobs', method: 'POST', data: toJobPayload(values) },
        jobDetailSchema,
      )
    ).job,

  update: async (id, values) =>
    (
      await request(
        client,
        { url: `/jobs/${id}`, method: 'PUT', data: toJobPayload(values) },
        jobDetailSchema,
      )
    ).job,

  changeStatus: async (id, status) =>
    (
      await request(
        client,
        { url: `/jobs/${id}/status`, method: 'PATCH', data: { status } },
        jobDetailSchema,
      )
    ).job,
});

export const jobApi: IJobApi = createJobApi();
