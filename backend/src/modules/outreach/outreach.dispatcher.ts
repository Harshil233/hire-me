import { OUTREACH_RECIPIENT_STATUSES, OUTREACH_WORKER } from '../../config/constants';
import type { IEmailSender } from '../../common/email/email.types';
import type { ILogger } from '../../common/types/logger';
import type { ICandidateProfileService } from '../candidate/candidate.interface';
import type { IJobService } from '../job/job.interface';
import type { IUserService } from '../user/user.interface';
import type {
  IOutreachDispatcher,
  IOutreachRepository,
  IUserEmailDirectory,
  OutreachCampaign,
} from './outreach.interface';
import { renderCampaignEmail } from './outreach.template';

export interface DispatcherConfig {
  readonly appBaseUrl: string;
  readonly unsubscribeSecret: string;
  readonly batchSize?: number;
}

/**
 * Drains the outreach queue, one message per recipient.
 *
 * Sending happens here rather than in the request that created the campaign: two hundred
 * messages would outlast any sensible timeout, and a crash halfway through must be
 * resumable rather than silently partial. Each recipient row is marked as it goes, so a
 * restart picks up exactly where it stopped and never sends twice.
 */
export class OutreachDispatcher implements IOutreachDispatcher {
  constructor(
    private readonly repository: IOutreachRepository,
    private readonly emails: IUserEmailDirectory,
    private readonly sender: IEmailSender,
    private readonly jobs: IJobService,
    private readonly candidateProfiles: ICandidateProfileService,
    private readonly users: IUserService,
    private readonly config: DispatcherConfig,
    private readonly logger: ILogger,
    private readonly now: () => Date,
  ) {}

  async runOnce(): Promise<number> {
    const campaign = await this.repository.claimNextQueuedCampaign();

    if (campaign === null) {
      return 0;
    }

    try {
      return await this.sendBatch(campaign);
    } catch (error: unknown) {
      // The campaign stays claimed; totals still settle from the recipient rows.
      this.logger.error('Outreach batch failed', {
        campaignId: campaign.id,
        reason: error instanceof Error ? error.message : String(error),
      });
      await this.repository.refreshCampaignTotals(campaign.id, this.now());
      return 0;
    }
  }

  private async sendBatch(campaign: OutreachCampaign): Promise<number> {
    const batchSize = this.config.batchSize ?? OUTREACH_WORKER.BATCH_SIZE;
    const recipients = await this.repository.takeQueuedRecipients(campaign.id, batchSize);

    if (recipients.length === 0) {
      await this.repository.refreshCampaignTotals(campaign.id, this.now());
      return 0;
    }

    const [job, sender, addresses] = await Promise.all([
      this.jobs.findManyByIds([campaign.jobId]),
      this.users.getById(campaign.createdByUserId),
      this.emails.findEmails(recipients.map((recipient) => recipient.candidateUserId)),
    ]);

    const listing = job.get(campaign.jobId);

    for (const recipient of recipients) {
      const at = this.now();
      const address = addresses.get(recipient.candidateUserId);

      // Re-checked at send time: someone may have opted out since being selected.
      const profile = await this.candidateProfiles
        .getByUserId(recipient.candidateUserId)
        .catch(() => null);

      if (address === undefined || listing === undefined || profile === null) {
        await this.repository.markRecipient(recipient.id, OUTREACH_RECIPIENT_STATUSES.SKIPPED, at);
        continue;
      }

      if (!profile.isOpenToOutreach) {
        await this.repository.markRecipient(recipient.id, OUTREACH_RECIPIENT_STATUSES.SKIPPED, at);
        continue;
      }

      try {
        await this.sender.send({
          to: address,
          subject: campaign.subject,
          fromName: `${listing.company.name} via Hire Me`,
          replyTo: sender.email,
          text: renderCampaignEmail({
            body: campaign.body,
            firstName: profile.firstName,
            job: listing,
            candidateUserId: recipient.candidateUserId,
            appBaseUrl: this.config.appBaseUrl,
            unsubscribeSecret: this.config.unsubscribeSecret,
          }),
        });

        await this.repository.markRecipient(recipient.id, OUTREACH_RECIPIENT_STATUSES.SENT, at);
      } catch (error: unknown) {
        await this.repository.markRecipient(
          recipient.id,
          OUTREACH_RECIPIENT_STATUSES.FAILED,
          at,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    await this.repository.refreshCampaignTotals(campaign.id, this.now());
    return recipients.length;
  }
}
