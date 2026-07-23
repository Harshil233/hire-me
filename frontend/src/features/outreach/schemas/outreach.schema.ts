import { z } from 'zod';

import { paginationSchema } from '@/features/jobs/schemas/job.schema';

export const campaignSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  subject: z.string(),
  body: z.string(),
  status: z.enum(['queued', 'sending', 'sent', 'failed']),
  recipientCount: z.number(),
  sentCount: z.number(),
  failedCount: z.number(),
  skippedCount: z.number(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
});
export type Campaign = z.infer<typeof campaignSchema>;

export const campaignResponseSchema = z.object({ campaign: campaignSchema });

export const campaignListSchema = z.object({
  campaigns: z.array(campaignSchema),
  pagination: paginationSchema,
});
export type CampaignList = z.infer<typeof campaignListSchema>;

export const audiencePreviewSchema = z.object({ recipientCount: z.number() });

/**
 * Who a campaign goes to. A tick list, or the search itself — the second is what makes
 * "everyone matching" one small request rather than a page of harvested addresses.
 */
export type CampaignAudience =
  | { readonly kind: 'selection'; readonly candidateUserIds: readonly string[] }
  | { readonly kind: 'filter'; readonly filter: Readonly<Record<string, string | undefined>> };

export interface CampaignDraft {
  readonly jobId: string;
  readonly subject: string;
  readonly body: string;
  readonly audience: CampaignAudience;
}

/** What a recruiter may drop into the subject or body, filled in per recipient. */
export const MERGE_TOKENS = ['firstName', 'jobTitle', 'companyName'] as const;
