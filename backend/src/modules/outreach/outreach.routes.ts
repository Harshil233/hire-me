import { Router, type RequestHandler } from 'express';

import { ROLES } from '../../config/constants';
import { authorize } from '../../common/middlewares/authorize.middleware';
import type { OutreachController } from './outreach.controller';
import {
  validateCampaignIdParam,
  validateCreateCampaign,
  validateOutreachQuery,
  validateUnsubscribe,
} from './outreach.validator';

export interface OutreachRoutesDependencies {
  readonly controller: OutreachController;
  readonly authenticate: RequestHandler;
  /** The same tighter limiter the credential routes use: bulk email deserves one. */
  readonly outreachRateLimiter: RequestHandler;
}

/**
 * Campaigns are HR-only. `unsubscribe` is the exception and is deliberately public — it
 * is reached from a link in an email, by someone with no session and, quite possibly, no
 * intention of ever signing in again.
 */
export const createOutreachRouter = ({
  controller,
  authenticate,
  outreachRateLimiter,
}: OutreachRoutesDependencies): Router => {
  const router = Router();

  router.post('/unsubscribe', validateUnsubscribe, controller.unsubscribe);

  router.use(authenticate, authorize(ROLES.HR));

  router.get('/campaigns', validateOutreachQuery, controller.list);
  router.get('/campaigns/:id', validateCampaignIdParam, controller.get);
  router.post('/campaigns/preview', validateCreateCampaign, controller.preview);
  router.post('/campaigns', outreachRateLimiter, validateCreateCampaign, controller.create);

  return router;
};
