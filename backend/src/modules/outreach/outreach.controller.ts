import type { Request, Response } from 'express';

import { requireAuth } from '../../common/middlewares/authorize.middleware';
import { validatedQuery } from '../../common/middlewares/validate.middleware';
import { HTTP_STATUS, sendSuccess } from '../../common/http/api-response';
import type { IOutreachService, OutreachCampaign } from './outreach.interface';
import type {
  CampaignIdParams,
  CreateCampaignInput,
  OutreachQueryInput,
  UnsubscribeInput,
} from './outreach.schema';

const toResponse = (campaign: OutreachCampaign): Record<string, unknown> => ({
  id: campaign.id,
  jobId: campaign.jobId,
  subject: campaign.subject,
  body: campaign.body,
  status: campaign.status,
  recipientCount: campaign.recipientCount,
  sentCount: campaign.sentCount,
  failedCount: campaign.failedCount,
  skippedCount: campaign.skippedCount,
  completedAt: campaign.completedAt?.toISOString(),
  createdAt: campaign.createdAt.toISOString(),
});

/** Translates HTTP ↔ service calls only; no business rules live here. */
export class OutreachController {
  constructor(private readonly outreachService: IOutreachService) {}

  create = async (
    req: Request<Record<string, never>, unknown, CreateCampaignInput>,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    const campaign = await this.outreachService.createCampaign(userId, req.body);

    sendSuccess(res, { campaign: toResponse(campaign) }, HTTP_STATUS.CREATED);
  };

  preview = async (
    req: Request<Record<string, never>, unknown, CreateCampaignInput>,
    res: Response,
  ): Promise<void> => {
    const { userId } = requireAuth(req);
    const recipientCount = await this.outreachService.previewAudience(userId, req.body);

    sendSuccess(res, { recipientCount });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { userId } = requireAuth(req);
    const query = validatedQuery<OutreachQueryInput>(req);
    const result = await this.outreachService.listCampaigns(userId, query);

    sendSuccess(res, {
      campaigns: result.campaigns.map((campaign) => toResponse(campaign)),
      pagination: result.pagination,
    });
  };

  get = async (req: Request<CampaignIdParams>, res: Response): Promise<void> => {
    const { userId } = requireAuth(req);
    const campaign = await this.outreachService.getCampaign(req.params.id, userId);

    sendSuccess(res, { campaign: toResponse(campaign) });
  };

  /** Public: the link is in an email, so the reader has no session. */
  unsubscribe = async (
    req: Request<Record<string, never>, unknown, UnsubscribeInput>,
    res: Response,
  ): Promise<void> => {
    await this.outreachService.unsubscribe(req.body.userId, req.body.token);

    sendSuccess(res, { unsubscribed: true });
  };
}
