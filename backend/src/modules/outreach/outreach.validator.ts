import type { RequestHandler } from 'express';

import { validateRequest } from '../../common/middlewares/validate.middleware';
import {
  campaignIdParamsSchema,
  createCampaignSchema,
  outreachQuerySchema,
  unsubscribeSchema,
} from './outreach.schema';

export const validateCreateCampaign: RequestHandler = validateRequest({
  body: createCampaignSchema,
});

export const validateOutreachQuery: RequestHandler = validateRequest({
  query: outreachQuerySchema,
});

export const validateCampaignIdParam: RequestHandler = validateRequest({
  params: campaignIdParamsSchema,
});

export const validateUnsubscribe: RequestHandler = validateRequest({ body: unsubscribeSchema });
