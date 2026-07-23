import type { AxiosInstance } from 'axios';

import { httpClient, request } from '@/services/api-client';
import { toQueryParams } from '@/features/jobs/api/job.api';
import {
  candidateDetailResponseSchema,
  candidateListSchema,
  type CandidateDetail,
  type CandidateFilters,
  type CandidateList,
} from '../schemas/candidate.schema';

export interface ICandidateApi {
  browse(filters: CandidateFilters): Promise<CandidateList>;
  detail(userId: string): Promise<CandidateDetail>;
}

export const createCandidateApi = (client: AxiosInstance = httpClient): ICandidateApi => ({
  browse: (filters) =>
    request(
      client,
      { url: '/candidates', method: 'GET', params: toQueryParams(filters) },
      candidateListSchema,
    ),

  detail: async (userId) =>
    (
      await request(
        client,
        { url: `/candidates/${userId}`, method: 'GET' },
        candidateDetailResponseSchema,
      )
    ).candidate,
});

export const candidateApi: ICandidateApi = createCandidateApi();
