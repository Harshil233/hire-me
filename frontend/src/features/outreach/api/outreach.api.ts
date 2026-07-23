import type { AxiosInstance } from 'axios';

import { httpClient, request } from '@/services/api-client';
import { toQueryParams } from '@/features/jobs/api/job.api';
import {
  audiencePreviewSchema,
  campaignListSchema,
  campaignResponseSchema,
  type Campaign,
  type CampaignDraft,
  type CampaignList,
} from '../schemas/outreach.schema';

export interface IOutreachApi {
  create(draft: CampaignDraft): Promise<Campaign>;
  /** How many people the selection reaches, before anything is sent. */
  preview(draft: CampaignDraft): Promise<number>;
  list(filters: Readonly<Record<string, string | number | undefined>>): Promise<CampaignList>;
}

export const createOutreachApi = (client: AxiosInstance = httpClient): IOutreachApi => ({
  create: async (draft) =>
    (
      await request(
        client,
        { url: '/outreach/campaigns', method: 'POST', data: draft },
        campaignResponseSchema,
      )
    ).campaign,

  preview: async (draft) =>
    (
      await request(
        client,
        { url: '/outreach/campaigns/preview', method: 'POST', data: draft },
        audiencePreviewSchema,
      )
    ).recipientCount,

  list: (filters) =>
    request(
      client,
      { url: '/outreach/campaigns', method: 'GET', params: toQueryParams(filters) },
      campaignListSchema,
    ),
});

export const outreachApi: IOutreachApi = createOutreachApi();

export interface IUnsubscribeApi {
  unsubscribe(userId: string, token: string): Promise<void>;
}

/** Separate, because this one is called by someone with no session at all. */
export const createUnsubscribeApi = (client: AxiosInstance = httpClient): IUnsubscribeApi => ({
  unsubscribe: async (userId, token) => {
    await client.request({
      url: '/outreach/unsubscribe',
      method: 'POST',
      data: { userId, token },
    });
  },
});

export const unsubscribeApi: IUnsubscribeApi = createUnsubscribeApi();
