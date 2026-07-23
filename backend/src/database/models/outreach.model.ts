import { Schema, model, type Types } from 'mongoose';

import {
  COLLECTIONS,
  OUTREACH_CAMPAIGN_STATUS_VALUES,
  OUTREACH_CAMPAIGN_STATUSES,
  OUTREACH_RECIPIENT_STATUS_VALUES,
  OUTREACH_RECIPIENT_STATUSES,
  type OutreachCampaignStatus,
  type OutreachRecipientStatus,
} from '../../config/constants';

export interface OutreachCampaignDocument {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  createdByUserId: Types.ObjectId;
  /** Every campaign is an invitation to one of the company's own listings. */
  jobId: Types.ObjectId;
  subject: string;
  body: string;
  status: OutreachCampaignStatus;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  completedAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<OutreachCampaignDocument>(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, ref: 'Company' },
    createdByUserId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    jobId: { type: Schema.Types.ObjectId, required: true, ref: 'Job' },
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: OUTREACH_CAMPAIGN_STATUS_VALUES,
      default: OUTREACH_CAMPAIGN_STATUSES.QUEUED,
    },
    recipientCount: { type: Number, required: true, default: 0 },
    sentCount: { type: Number, required: true, default: 0 },
    failedCount: { type: Number, required: true, default: 0 },
    skippedCount: { type: Number, required: true, default: 0 },
    completedAt: { type: Date, required: false },
  },
  { timestamps: true, collection: COLLECTIONS.OUTREACH_CAMPAIGNS },
);

// The employer's own history, newest first.
campaignSchema.index({ companyId: 1, createdAt: -1 });
// The worker's queue.
campaignSchema.index({ status: 1, createdAt: 1 });

export const OutreachCampaignModel = model<OutreachCampaignDocument>(
  'OutreachCampaign',
  campaignSchema,
);

export interface OutreachRecipientDocument {
  _id: Types.ObjectId;
  campaignId: Types.ObjectId;
  /**
   * The candidate, not their address. Storing the id keeps one source of truth for an
   * email and means an audit trail never becomes a stale copy of personal data.
   */
  candidateUserId: Types.ObjectId;
  status: OutreachRecipientStatus;
  error?: string | undefined;
  sentAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const recipientSchema = new Schema<OutreachRecipientDocument>(
  {
    campaignId: { type: Schema.Types.ObjectId, required: true, ref: 'OutreachCampaign' },
    candidateUserId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    status: {
      type: String,
      required: true,
      enum: OUTREACH_RECIPIENT_STATUS_VALUES,
      default: OUTREACH_RECIPIENT_STATUSES.QUEUED,
    },
    error: { type: String, required: false },
    sentAt: { type: Date, required: false },
  },
  { timestamps: true, collection: COLLECTIONS.OUTREACH_RECIPIENTS },
);

// One row per candidate per campaign: a retry must never double-send.
recipientSchema.index({ campaignId: 1, candidateUserId: 1 }, { unique: true });
recipientSchema.index({ status: 1, campaignId: 1 });
// Answers "has this company contacted this person recently", and the daily cap.
recipientSchema.index({ candidateUserId: 1, createdAt: -1 });

export const OutreachRecipientModel = model<OutreachRecipientDocument>(
  'OutreachRecipient',
  recipientSchema,
);
