import { z } from 'zod';

import { JOB_TYPE_VALUES, PAGINATION, VALIDATION_LIMITS } from '../../config/constants';
import { objectIdSchema, requiredText } from '../../common/validation/fields';
import { candidateQuerySchema } from '../candidate/candidate.schema';

/**
 * Who a campaign goes to. Either an explicit tick-list, or the search the employer was
 * looking at — the second is what makes "select all 200 matching" one small request
 * instead of a page of harvested addresses.
 */
export const campaignAudienceSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('selection'),
    candidateUserIds: z
      .array(objectIdSchema)
      .min(1, 'Select at least one candidate')
      .max(VALIDATION_LIMITS.LIST_MAX_ITEMS * 10, 'Too many candidates in one selection'),
  }),
  z.object({
    kind: z.literal('filter'),
    // The same filter the talent-pool screen uses, minus paging.
    filter: candidateQuerySchema.omit({ page: true, pageSize: true }),
  }),
]);
export type CampaignAudienceInput = z.infer<typeof campaignAudienceSchema>;

export const createCampaignSchema = z.object({
  /** The listing being advertised. Ownership is checked against the caller's company. */
  jobId: objectIdSchema,
  subject: requiredText('Subject', VALIDATION_LIMITS.EMAIL_SUBJECT_MAX_LENGTH),
  body: requiredText('Message', VALIDATION_LIMITS.EMAIL_BODY_MAX_LENGTH),
  audience: campaignAudienceSchema,
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const outreachQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(PAGINATION.DEFAULT_PAGE),
  pageSize: z.coerce
    .number()
    .int()
    .positive()
    .max(PAGINATION.MAX_PAGE_SIZE)
    .default(PAGINATION.DEFAULT_PAGE_SIZE),
});
export type OutreachQueryInput = z.infer<typeof outreachQuerySchema>;

export const campaignIdParamsSchema = z.object({ id: objectIdSchema });
export type CampaignIdParams = z.infer<typeof campaignIdParamsSchema>;

export const unsubscribeSchema = z.object({
  userId: objectIdSchema,
  token: z.string().min(1, 'The unsubscribe link is incomplete'),
});
export type UnsubscribeInput = z.infer<typeof unsubscribeSchema>;

/** Job types are echoed in the audience filter; re-declared here for the response shape. */
export const campaignResponseSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  subject: z.string(),
  body: z.string(),
  status: z.string(),
  recipientCount: z.number(),
  sentCount: z.number(),
  failedCount: z.number(),
  skippedCount: z.number(),
  completedAt: z.iso.datetime().optional(),
  createdAt: z.iso.datetime(),
  jobTypes: z.array(z.enum(JOB_TYPE_VALUES)).optional(),
});
export type CampaignResponse = z.infer<typeof campaignResponseSchema>;
