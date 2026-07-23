import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { ApiError } from '@/services/api-error';
import { outreachApi, type IOutreachApi } from '../api/outreach.api';
import type { Campaign, CampaignDraft, CampaignList } from '../schemas/outreach.schema';

export const useCampaigns = (
  filters: Readonly<Record<string, string | number | undefined>>,
  api: IOutreachApi = outreachApi,
): UseQueryResult<CampaignList, ApiError> =>
  useQuery<CampaignList, ApiError>({
    queryKey: QUERY_KEYS.campaigns(filters),
    queryFn: () => api.list(filters),
    // Sending happens on a worker, so the counts move after the page has loaded.
    refetchInterval: 5000,
  });

/** Counts the audience without sending, so the recruiter sees the reach before pressing send. */
export const useAudiencePreview = (
  draft: CampaignDraft | null,
  api: IOutreachApi = outreachApi,
): UseQueryResult<number, ApiError> =>
  useQuery<number, ApiError>({
    queryKey: QUERY_KEYS.audiencePreview(draft?.audience ?? {}),
    enabled: draft !== null,
    queryFn: () => {
      if (draft === null) {
        return Promise.resolve(0);
      }
      return api.preview(draft);
    },
  });

export const useSendCampaign = (
  api: IOutreachApi = outreachApi,
): UseMutationResult<Campaign, ApiError, CampaignDraft> => {
  const queryClient = useQueryClient();

  return useMutation<Campaign, ApiError, CampaignDraft>({
    mutationFn: (draft) => api.create(draft),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
};
