import type { Model } from 'mongoose';

import {
  OUTREACH_CAMPAIGN_STATUSES,
  OUTREACH_RECIPIENT_STATUSES,
  type OutreachRecipientStatus,
} from '../../config/constants';
import { toIdString, toObjectId, toObjectIdOrNull } from '../../common/persistence/object-id';
import type { Page } from '../../common/persistence/page';
import type {
  OutreachCampaignDocument,
  OutreachRecipientDocument,
} from '../../database/models/outreach.model';
import type {
  CreateCampaignData,
  IOutreachRepository,
  OutreachCampaign,
  OutreachRecipient,
} from './outreach.interface';

/** The only place the outreach collections are touched (CLAUDE.md §6). */
export class OutreachRepository implements IOutreachRepository {
  constructor(
    private readonly campaigns: Model<OutreachCampaignDocument>,
    private readonly recipients: Model<OutreachRecipientDocument>,
  ) {}

  async createCampaign(data: CreateCampaignData): Promise<OutreachCampaign> {
    const created = await this.campaigns.create({
      companyId: toObjectId(data.companyId),
      createdByUserId: toObjectId(data.createdByUserId),
      jobId: toObjectId(data.jobId),
      subject: data.subject,
      body: data.body,
      recipientCount: data.recipientCount,
    });

    return OutreachRepository.toCampaign(created.toObject<OutreachCampaignDocument>());
  }

  async findCampaignById(id: string): Promise<OutreachCampaign | null> {
    const objectId = toObjectIdOrNull(id);
    if (objectId === null) {
      return null;
    }

    const document = await this.campaigns
      .findById(objectId)
      .lean<OutreachCampaignDocument | null>()
      .exec();

    return document === null ? null : OutreachRepository.toCampaign(document);
  }

  async listCampaignsForCompany(
    companyId: string,
    page: number,
    pageSize: number,
  ): Promise<Page<OutreachCampaign>> {
    const objectId = toObjectIdOrNull(companyId);
    if (objectId === null) {
      return { items: [], total: 0 };
    }

    const query = { companyId: objectId };
    const [documents, total] = await Promise.all([
      this.campaigns
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean<OutreachCampaignDocument[]>()
        .exec(),
      this.campaigns.countDocuments(query).exec(),
    ]);

    return { items: documents.map((d) => OutreachRepository.toCampaign(d)), total };
  }

  /**
   * Inserted unordered so one duplicate does not abandon the rest. The unique index on
   * (campaign, candidate) is what makes a repeat harmless rather than a second email.
   */
  async addRecipients(campaignId: string, candidateUserIds: readonly string[]): Promise<number> {
    if (candidateUserIds.length === 0) {
      return 0;
    }

    const rows = candidateUserIds.map((userId) => ({
      campaignId: toObjectId(campaignId),
      candidateUserId: toObjectId(userId),
    }));

    try {
      const inserted = await this.recipients.insertMany(rows, { ordered: false });
      return inserted.length;
    } catch (error: unknown) {
      // A duplicate-key error still inserts the rest; count what actually landed.
      const written = (error as { insertedDocs?: unknown[] }).insertedDocs;
      if (Array.isArray(written)) {
        return written.length;
      }
      throw error;
    }
  }

  async listRecipients(campaignId: string): Promise<OutreachRecipient[]> {
    const objectId = toObjectIdOrNull(campaignId);
    if (objectId === null) {
      return [];
    }

    const documents = await this.recipients
      .find({ campaignId: objectId })
      .lean<OutreachRecipientDocument[]>()
      .exec();

    return documents.map((d) => OutreachRepository.toRecipient(d));
  }

  /** Atomic claim: the status flip and the read are one operation, so two workers cannot both win. */
  async claimNextQueuedCampaign(): Promise<OutreachCampaign | null> {
    const document = await this.campaigns
      .findOneAndUpdate(
        { status: OUTREACH_CAMPAIGN_STATUSES.QUEUED },
        { $set: { status: OUTREACH_CAMPAIGN_STATUSES.SENDING } },
        { new: true, sort: { createdAt: 1 } },
      )
      .lean<OutreachCampaignDocument | null>()
      .exec();

    return document === null ? null : OutreachRepository.toCampaign(document);
  }

  async takeQueuedRecipients(campaignId: string, limit: number): Promise<OutreachRecipient[]> {
    const objectId = toObjectIdOrNull(campaignId);
    if (objectId === null) {
      return [];
    }

    const documents = await this.recipients
      .find({ campaignId: objectId, status: OUTREACH_RECIPIENT_STATUSES.QUEUED })
      .limit(limit)
      .lean<OutreachRecipientDocument[]>()
      .exec();

    return documents.map((d) => OutreachRepository.toRecipient(d));
  }

  async markRecipient(
    id: string,
    status: OutreachRecipientStatus,
    at: Date,
    error?: string,
  ): Promise<void> {
    const objectId = toObjectIdOrNull(id);
    if (objectId === null) {
      return;
    }

    await this.recipients
      .updateOne(
        { _id: objectId },
        {
          $set: {
            status,
            sentAt: at,
            // Truncated: a provider message is for our logs, not a growing document.
            ...(error === undefined ? {} : { error: error.slice(0, 300) }),
          },
        },
      )
      .exec();
  }

  /** Recomputes the counters from the recipient rows, which are the source of truth. */
  async refreshCampaignTotals(campaignId: string, at: Date): Promise<OutreachCampaign | null> {
    const objectId = toObjectIdOrNull(campaignId);
    if (objectId === null) {
      return null;
    }

    const counts = await this.recipients.aggregate<{ _id: OutreachRecipientStatus; n: number }>([
      { $match: { campaignId: objectId } },
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]);

    const by = (status: OutreachRecipientStatus): number =>
      counts.find((row) => row._id === status)?.n ?? 0;

    const queued = by(OUTREACH_RECIPIENT_STATUSES.QUEUED);
    const failed = by(OUTREACH_RECIPIENT_STATUSES.FAILED);
    const sent = by(OUTREACH_RECIPIENT_STATUSES.SENT);
    const isDone = queued === 0;

    const document = await this.campaigns
      .findOneAndUpdate(
        { _id: objectId },
        {
          $set: {
            sentCount: sent,
            failedCount: failed,
            skippedCount: by(OUTREACH_RECIPIENT_STATUSES.SKIPPED),
            ...(isDone
              ? {
                  // Nothing delivered at all is a failure worth showing as one.
                  status:
                    sent === 0 && failed > 0
                      ? OUTREACH_CAMPAIGN_STATUSES.FAILED
                      : OUTREACH_CAMPAIGN_STATUSES.SENT,
                  completedAt: at,
                }
              : {}),
          },
        },
        { new: true },
      )
      .lean<OutreachCampaignDocument | null>()
      .exec();

    return document === null ? null : OutreachRepository.toCampaign(document);
  }

  async countRecipientsSince(companyId: string, since: Date): Promise<number> {
    const objectId = toObjectIdOrNull(companyId);
    if (objectId === null) {
      return 0;
    }

    const campaignIds = await this.campaigns.distinct('_id', { companyId: objectId });

    return this.recipients
      .countDocuments({ campaignId: { $in: campaignIds }, createdAt: { $gte: since } })
      .exec();
  }

  private static toCampaign(document: OutreachCampaignDocument): OutreachCampaign {
    return {
      id: toIdString(document._id),
      companyId: toIdString(document.companyId),
      createdByUserId: toIdString(document.createdByUserId),
      jobId: toIdString(document.jobId),
      subject: document.subject,
      body: document.body,
      status: document.status,
      recipientCount: document.recipientCount,
      sentCount: document.sentCount,
      failedCount: document.failedCount,
      skippedCount: document.skippedCount,
      completedAt: document.completedAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  private static toRecipient(document: OutreachRecipientDocument): OutreachRecipient {
    return {
      id: toIdString(document._id),
      campaignId: toIdString(document.campaignId),
      candidateUserId: toIdString(document.candidateUserId),
      status: document.status,
      error: document.error,
      sentAt: document.sentAt,
    };
  }
}
