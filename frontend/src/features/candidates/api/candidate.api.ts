import type { AxiosInstance } from 'axios';

import { httpClient, request } from '@/services/api-client';
import { toQueryParams } from '@/features/jobs/api/job.api';
import {
  candidateListSchema,
  type CandidateFilters,
  type CandidateList,
} from '../schemas/candidate.schema';

export interface ICandidateApi {
  browse(filters: CandidateFilters): Promise<CandidateList>;
}

export const createCandidateApi = (client: AxiosInstance = httpClient): ICandidateApi => ({
  browse: (filters) =>
    request(
      client,
      { url: '/candidates', method: 'GET', params: toQueryParams(filters) },
      candidateListSchema,
    ),
});

export const candidateApi: ICandidateApi = createCandidateApi();
