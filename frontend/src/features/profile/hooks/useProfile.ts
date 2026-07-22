import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { QUERY_KEYS, type FileKind } from '@/config/constants';
import type { ApiError } from '@/services/api-error';
import { profileApi, type IProfileApi, type UploadedFile } from '../api/profile.api';
import type { Company, ProfileView } from '../schemas/profile.schema';

export const useProfile = (api: IProfileApi = profileApi): UseQueryResult<ProfileView, ApiError> =>
  useQuery<ProfileView, ApiError>({
    queryKey: QUERY_KEYS.profile,
    queryFn: () => api.getProfile(),
    staleTime: 30_000,
  });

/** Every profile write returns the recomputed view, so the cache is replaced outright. */
export const useUpdateProfile = (
  api: IProfileApi = profileApi,
): UseMutationResult<ProfileView, ApiError, Record<string, unknown>> => {
  const queryClient = useQueryClient();

  return useMutation<ProfileView, ApiError, Record<string, unknown>>({
    mutationFn: (payload) => api.updateProfile(payload),
    onSuccess: (view) => {
      queryClient.setQueryData(QUERY_KEYS.profile, view);
    },
  });
};

export interface UpdateCompanyVariables {
  readonly companyId: string;
  readonly payload: Record<string, unknown>;
}

export const useUpdateCompany = (
  api: IProfileApi = profileApi,
): UseMutationResult<Company, ApiError, UpdateCompanyVariables> => {
  const queryClient = useQueryClient();

  return useMutation<Company, ApiError, UpdateCompanyVariables>({
    mutationFn: ({ companyId, payload }) => api.updateCompany(companyId, payload),
    // The company feeds the HR completion score, so the profile is refetched.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile });
    },
  });
};

export interface UploadVariables {
  readonly kind: FileKind;
  readonly file: File;
}

export const useUploadFile = (
  api: IProfileApi = profileApi,
): UseMutationResult<UploadedFile, ApiError, UploadVariables> =>
  useMutation<UploadedFile, ApiError, UploadVariables>({
    mutationFn: ({ kind, file }) => api.uploadFile(kind, file),
  });
