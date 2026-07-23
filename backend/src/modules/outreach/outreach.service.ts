import { OUTREACH_CAMPAIGN_STATUSES } from '../../config/constants';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { toPaginationMeta } from '../../common/http/api-response';
import type { ICompanyMembership } from '../company/company.interface';
import type { IJobSummaryProvider } from '../job/job.interface';
import type { ICandidateProfileService } from '../candidate/candidate.interface';
import type {
  AudienceMember,
  CampaignListResult,
  ICandidateAudience,
  IOutreachRepository,
  IOutreachService,
  OutreachCampaign,
} from './outreach.interface';
import type { CreateCampaignInput, OutreachQueryInput } from './outreach.schema';
import { isValidUnsubscribeToken } from './unsubscribe-token';

export interface OutreachLimits {
  readonly maxRecipients: number;
  readonly dailyLimit: number;
  readonly unsubscribeSecret: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Campaign rules. Every one of them exists because bulk email is one careless click away
 * from being spam: the listing must belong to the sender, the audience is resolved server
 * side from people who allow contact, and both the size of a send and the number a company
 * may send in a day are capped.
 */
export class OutreachService implements IOutreachService {
  constructor(
    private readonly repository: IOutreachRepository,
    private readonly membership: ICompanyMembership,
    private readonly jobs: IJobSummaryProvider,
    private readonly audience: ICandidateAudience,
    private readonly candidateProfiles: ICandidateProfileService,
    private readonly limits: OutreachLimits,
    private readonly now: () => Date,
  ) {}

  async createCampaign(userId: string, input: CreateCampaignInput): Promise<OutreachCampaign> {
    const companyId = await this.requireCompanyId(userId);
    await this.requireOwnJob(input.jobId, companyId);

    const members = await this.resolveAudience(input);

    if (members.length === 0) {
      throw new ValidationError(
        'Nobody in this selection can be contacted',
        [{ field: 'audience', message: 'Every candidate has opted out of employer email' }],
        ERROR_CODES.VALIDATION_ERROR,
      );
    }

    await this.assertWithinDailyLimit(companyId, members.length);

    const campaign = await this.repository.createCampaign({
      companyId,
      createdByUserId: userId,
      jobId: input.jobId,
      subject: input.subject,
      body: input.body,
      recipientCount: members.length,
    });

    await this.repository.addRecipients(
      campaign.id,
      members.map((member) => member.userId),
    );

    return campaign;
  }

  async previewAudience(userId: string, input: CreateCampaignInput): Promise<number> {
    await this.requireCompanyId(userId);
    return (await this.resolveAudience(input)).length;
  }

  async listCampaigns(userId: string, query: OutreachQueryInput): Promise<CampaignListResult> {
    const companyId = await this.requireCompanyId(userId);
    const { items, total } = await this.repository.listCampaignsForCompany(
      companyId,
      query.page,
      query.pageSize,
    );

    return { campaigns: items, pagination: toPaginationMeta(total, query.page, query.pageSize) };
  }

  async getCampaign(id: string, userId: string): Promise<OutreachCampaign> {
    const companyId = await this.requireCompanyId(userId);
    const campaign = await this.repository.findCampaignById(id);

    // Another company's campaign is reported as missing, never as forbidden.
    if (campaign === null || campaign.companyId !== companyId) {
      throw new NotFoundError('Campaign not found', ERROR_CODES.NOT_FOUND);
    }

    return campaign;
  }

  /** Public, and deliberately quiet: a bad token must not confirm that an account exists. */
  async unsubscribe(userId: string, token: string): Promise<void> {
    if (!isValidUnsubscribeToken(userId, token, this.limits.unsubscribeSecret)) {
      throw new ForbiddenError('That unsubscribe link is not valid', ERROR_CODES.FORBIDDEN);
    }

    await this.candidateProfiles.update(userId, { isOpenToOutreach: false });
  }

  /**
   * The browser sends who to contact, never a list of addresses. A filter is resolved
   * here so "everyone matching this search" costs one small request.
   */
  private async resolveAudience(input: CreateCampaignInput): Promise<AudienceMember[]> {
    const members =
      input.audience.kind === 'selection'
        ? await this.audience.findByUserIds(input.audience.candidateUserIds)
        : await this.audience.findByFilter(input.audience.filter, this.limits.maxRecipients);

    if (members.length > this.limits.maxRecipients) {
      throw new ValidationError(
        `A campaign cannot reach more than ${String(this.limits.maxRecipients)} people`,
        [{ field: 'audience', message: 'Narrow the search and send in smaller batches' }],
        ERROR_CODES.VALIDATION_ERROR,
      );
    }

    return members;
  }

  private async assertWithinDailyLimit(companyId: string, adding: number): Promise<void> {
    const since = new Date(this.now().getTime() - DAY_MS);
    const already = await this.repository.countRecipientsSince(companyId, since);

    if (already + adding > this.limits.dailyLimit) {
      throw new ConflictError(
        `Your company has reached its limit of ${String(this.limits.dailyLimit)} outreach emails a day`,
        ERROR_CODES.RATE_LIMITED,
      );
    }
  }

  private async requireCompanyId(userId: string): Promise<string> {
    const companyId = await this.membership.findCompanyIdForUser(userId);

    if (companyId === null) {
      throw new ConflictError(
        'Register your company before contacting candidates',
        ERROR_CODES.HR_HAS_NO_COMPANY,
      );
    }

    return companyId;
  }

  /** You may only advertise your own company's listing, and only a published one. */
  private async requireOwnJob(jobId: string, companyId: string): Promise<void> {
    const job = await this.jobs.findSummaryById(jobId);

    if (job === null || job.companyId !== companyId) {
      throw new NotFoundError('Job not found', ERROR_CODES.JOB_NOT_FOUND);
    }

    if (job.status !== 'published') {
      throw new ValidationError(
        'Publish the listing before inviting candidates to it',
        [{ field: 'jobId', message: 'Only a published job can be advertised' }],
        ERROR_CODES.VALIDATION_ERROR,
      );
    }
  }
}

export { OUTREACH_CAMPAIGN_STATUSES };
