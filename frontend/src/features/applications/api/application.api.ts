import type { AxiosInstance } from 'axios';

import type { ApplicationStatus } from '@/config/constants';
import { httpClient, request } from '@/services/api-client';
import { toQueryParams } from '@/features/jobs/api/job.api';
import {
  applicantListSchema,
  applicationDetailSchema,
  applicationStatusResultSchema,
  myApplicationListSchema,
  type ApplicantList,
  type ApplicationFilters,
  type ApplyFormValues,
  type MyApplication,
  type MyApplicationList,
} from '../schemas/application.schema';

export interface IApplicationApi {
  apply(jobId: string, values: ApplyFormValues): Promise<MyApplication>;
  listMine(filters: ApplicationFilters): Promise<MyApplicationList>;
  listForJob(jobId: string, filters: ApplicationFilters): Promise<ApplicantList>;
  changeStatus(id: string, status: ApplicationStatus): Promise<ApplicationStatus>;
}

/** An empty note is omitted so the server records "no cover note" rather than `""`. */
const toApplyPayload = (values: ApplyFormValues): Record<string, unknown> =>
  values.coverNote.trim() === '' ? {} : { coverNote: values.coverNote };

export const createApplicationApi = (client: AxiosInstance = httpClient): IApplicationApi => ({
  apply: async (jobId, values) =>
    (
      await request(
        client,
        { url: `/jobs/${jobId}/apply`, method: 'POST', data: toApplyPayload(values) },
        applicationDetailSchema,
      )
    ).application,

  listMine: (filters) =>
    request(
      client,
      { url: '/applications', method: 'GET', params: toQueryParams(filters) },
      myApplicationListSchema,
    ),

  listForJob: (jobId, filters) =>
    request(
      client,
      { url: `/jobs/${jobId}/applications`, method: 'GET', params: toQueryParams(filters) },
      applicantListSchema,
    ),

  changeStatus: async (id, status) =>
    (
      await request(
        client,
        { url: `/applications/${id}/status`, method: 'PATCH', data: { status } },
        applicationStatusResultSchema,
      )
    ).application.status,
});

export const applicationApi: IApplicationApi = createApplicationApi();
