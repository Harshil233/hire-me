import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { ApiError } from '@/services/api-error';
import { candidateApi, type ICandidateApi } from '../api/candidate.api';
import type { CandidateFilters, CandidateList } from '../schemas/candidate.schema';

/** The employer-facing talent pool. */
export const useCandidates = (
  filters: CandidateFilters,
  api: ICandidateApi = candidateApi,
): UseQueryResult<CandidateList, ApiError> =>
  useQuery<CandidateList, ApiError>({
    queryKey: QUERY_KEYS.candidates(filters),
    queryFn: () => api.browse(filters),
  });
