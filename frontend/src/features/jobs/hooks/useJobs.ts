import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { QUERY_KEYS, type JobStatus } from '@/config/constants';
import type { ApiError } from '@/services/api-error';
import { jobApi, type IJobApi } from '../api/job.api';
import type { Job, JobFilters, JobFormValues, JobList } from '../schemas/job.schema';

/** Candidate-facing browse. Refetches whenever a filter or the page changes. */
export const useJobs = (
  filters: JobFilters,
  api: IJobApi = jobApi,
): UseQueryResult<JobList, ApiError> =>
  useQuery<JobList, ApiError>({
    queryKey: QUERY_KEYS.jobs(filters),
    queryFn: () => api.browse(filters),
  });

/** HR-facing list of their own company's postings, drafts included. */
export const useMyJobs = (
  filters: JobFilters,
  api: IJobApi = jobApi,
): UseQueryResult<JobList, ApiError> =>
  useQuery<JobList, ApiError>({
    queryKey: QUERY_KEYS.myJobs(filters),
    queryFn: () => api.listMine(filters),
  });

/**
 * The skills worth filtering by, derived from live listings. Cached for the session:
 * the vocabulary only moves when somebody posts a job.
 */
export const useJobSkills = (
  api: IJobApi = jobApi,
): UseQueryResult<readonly string[], ApiError> =>
  useQuery<readonly string[], ApiError>({
    queryKey: QUERY_KEYS.jobSkills,
    queryFn: () => api.listSkills(),
    staleTime: Infinity,
  });

export const useJob = (id: string, api: IJobApi = jobApi): UseQueryResult<Job, ApiError> =>
  useQuery<Job, ApiError>({
    queryKey: QUERY_KEYS.job(id),
    queryFn: () => api.getById(id),
    enabled: id !== '',
  });

export interface SaveJobVariables {
  /** Absent when creating. */
  readonly id?: string | undefined;
  readonly values: JobFormValues;
}

export interface UseJobMutationsResult {
  readonly save: UseMutationResult<Job, ApiError, SaveJobVariables>;
  readonly changeStatus: UseMutationResult<Job, ApiError, ChangeStatusVariables>;
}

export interface ChangeStatusVariables {
  readonly id: string;
  readonly status: JobStatus;
}

/**
 * Create, edit and publish/close in one hook. Every success invalidates the job caches,
 * because a posting appearing or changing status moves it between lists.
 */
export const useJobMutations = (api: IJobApi = jobApi): UseJobMutationsResult => {
  const queryClient = useQueryClient();

  const invalidate = async (job: Job): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['jobs'] }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.job(job.id) }),
    ]);
  };

  const save = useMutation<Job, ApiError, SaveJobVariables>({
    mutationFn: ({ id, values }) =>
      id === undefined ? api.create(values) : api.update(id, values),
    onSuccess: invalidate,
  });

  const changeStatus = useMutation<Job, ApiError, ChangeStatusVariables>({
    mutationFn: ({ id, status }) => api.changeStatus(id, status),
    onSuccess: invalidate,
  });

  return { save, changeStatus };
};
