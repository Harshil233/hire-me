import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { QUERY_KEYS, type ApplicationStatus } from '@/config/constants';
import type { ApiError } from '@/services/api-error';
import { applicationApi, type IApplicationApi } from '../api/application.api';
import type {
  ApplicantList,
  ApplicationFilters,
  ApplyFormValues,
  MyApplication,
  MyApplicationList,
} from '../schemas/application.schema';

/** The candidate's own applications. */
export const useMyApplications = (
  filters: ApplicationFilters,
  api: IApplicationApi = applicationApi,
): UseQueryResult<MyApplicationList, ApiError> =>
  useQuery<MyApplicationList, ApiError>({
    queryKey: QUERY_KEYS.myApplications(filters),
    queryFn: () => api.listMine(filters),
  });

/**
 * The listings this candidate has already applied to, as a set the caller can ask about
 * per card. One small request for the whole list beats a per-job lookup, and applying
 * invalidates it, so a card stops offering an action the server would refuse.
 */
export const useAppliedJobIds = (
  isCandidate: boolean,
  api: IApplicationApi = applicationApi,
): UseQueryResult<ReadonlySet<string>, ApiError> =>
  useQuery<ReadonlySet<string>, ApiError>({
    queryKey: QUERY_KEYS.appliedJobIds,
    queryFn: async () => new Set(await api.listAppliedJobIds()),
    // The route is candidate-only; asking as an employer would just earn a 403.
    enabled: isCandidate,
  });

/** The employer's applicant list for one job. */
export const useJobApplicants = (
  jobId: string,
  filters: ApplicationFilters,
  api: IApplicationApi = applicationApi,
): UseQueryResult<ApplicantList, ApiError> =>
  useQuery<ApplicantList, ApiError>({
    queryKey: QUERY_KEYS.jobApplicants(jobId, filters),
    queryFn: () => api.listForJob(jobId, filters),
    enabled: jobId !== '',
  });

export interface ApplyVariables {
  readonly jobId: string;
  readonly values: ApplyFormValues;
}

export const useApply = (
  api: IApplicationApi = applicationApi,
): UseMutationResult<MyApplication, ApiError, ApplyVariables> => {
  const queryClient = useQueryClient();

  return useMutation<MyApplication, ApiError, ApplyVariables>({
    mutationFn: ({ jobId, values }) => api.apply(jobId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
};

export interface ChangeApplicationStatusVariables {
  readonly id: string;
  readonly status: ApplicationStatus;
}

/**
 * Used by both sides: an employer shortlists or rejects, a candidate withdraws. The
 * server decides which target states each role may set, so the hook stays role-agnostic.
 */
export const useChangeApplicationStatus = (
  api: IApplicationApi = applicationApi,
): UseMutationResult<ApplicationStatus, ApiError, ChangeApplicationStatusVariables> => {
  const queryClient = useQueryClient();

  return useMutation<ApplicationStatus, ApiError, ChangeApplicationStatusVariables>({
    mutationFn: ({ id, status }) => api.changeStatus(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
  });
};
