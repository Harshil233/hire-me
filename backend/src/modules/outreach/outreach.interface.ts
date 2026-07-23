import type { OutreachCampaignStatus, OutreachRecipientStatus } from '../../config/constants';
import type { PaginationMeta } from '../../common/http/api-response';
import type { Page } from '../../common/persistence/page';
import { createToken, type Token } from '../../container/token';
import type { CandidateFilter } from '../candidate/candidate.interface';
import type { CreateCampaignInput, OutreachQueryInput } from './outreach.schema';

export interface OutreachCampaign {
  readonly id: string;
  readonly companyId: string;
  readonly createdByUserId: string;
  readonly jobId: string;
  readonly subject: string;
  readonly body: string;
  readonly status: OutreachCampaignStatus;
  readonly recipientCount: number;
  readonly sentCount: number;
  readonly failedCount: number;
  readonly skippedCount: number;
  readonly completedAt?: Date | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface OutreachRecipient {
  readonly id: string;
  readonly campaignId: string;
  readonly candidateUserId: string;
  readonly status: OutreachRecipientStatus;
  readonly error?: string | undefined;
  readonly sentAt?: Date | undefined;
}

export interface CreateCampaignData {
  readonly companyId: string;
  readonly createdByUserId: string;
  readonly jobId: string;
  readonly subject: string;
  readonly body: string;
  readonly recipientCount: number;
}

export interface IOutreachRepository {
  createCampaign(data: CreateCampaignData): Promise<OutreachCampaign>;
  findCampaignById(id: string): Promise<OutreachCampaign | null>;
  listCampaignsForCompany(
    companyId: string,
    page: number,
    pageSize: number,
  ): Promise<Page<OutreachCampaign>>;
  /** Ignores candidates already queued for this campaign, so a retry cannot double-send. */
  addRecipients(campaignId: string, candidateUserIds: readonly string[]): Promise<number>;
  listRecipients(campaignId: string): Promise<OutreachRecipient[]>;
  /** Takes the next queued campaign and marks it in flight, so two workers cannot share one. */
  claimNextQueuedCampaign(): Promise<OutreachCampaign | null>;
  takeQueuedRecipients(campaignId: string, limit: number): Promise<OutreachRecipient[]>;
  markRecipient(
    id: string,
    status: OutreachRecipientStatus,
    at: Date,
    error?: string,
  ): Promise<void>;
  refreshCampaignTotals(campaignId: string, at: Date): Promise<OutreachCampaign | null>;
  /** How many candidates this company has mailed since `since`, for the daily cap. */
  countRecipientsSince(companyId: string, since: Date): Promise<number>;
}

/** One person a campaign will reach. The address is resolved at send time, never stored. */
export interface AudienceMember {
  readonly userId: string;
  readonly firstName: string;
}

/**
 * Port over the candidate pool. Outreach must not reach into the candidate repository
 * itself (CLAUDE.md §5), and only ever asks for people who allow being contacted.
 */
export interface ICandidateAudience {
  findByFilter(filter: CandidateFilter, limit: number): Promise<AudienceMember[]>;
  findByUserIds(userIds: readonly string[]): Promise<AudienceMember[]>;
}

/** Port over accounts, so outreach can address an email without storing the address. */
export interface IUserEmailDirectory {
  findEmails(userIds: readonly string[]): Promise<ReadonlyMap<string, string>>;
}

export interface CampaignListResult {
  readonly campaigns: readonly OutreachCampaign[];
  readonly pagination: PaginationMeta;
}

export interface IOutreachService {
  createCampaign(userId: string, input: CreateCampaignInput): Promise<OutreachCampaign>;
  listCampaigns(userId: string, query: OutreachQueryInput): Promise<CampaignListResult>;
  getCampaign(id: string, userId: string): Promise<OutreachCampaign>;
  /** How many people the given selection would actually reach, before anything is sent. */
  previewAudience(userId: string, input: CreateCampaignInput): Promise<number>;
  unsubscribe(userId: string, token: string): Promise<void>;
}

/** Drains the queue. Separate from the service so the HTTP path never sends inline. */
export interface IOutreachDispatcher {
  /** Sends one batch. Returns how many messages were attempted. */
  runOnce(): Promise<number>;
}

export const OUTREACH_REPOSITORY: Token<IOutreachRepository> = createToken('IOutreachRepository');
export const OUTREACH_SERVICE: Token<IOutreachService> = createToken('IOutreachService');
export const OUTREACH_DISPATCHER: Token<IOutreachDispatcher> = createToken('IOutreachDispatcher');
export const CANDIDATE_AUDIENCE: Token<ICandidateAudience> = createToken('ICandidateAudience');
export const USER_EMAIL_DIRECTORY: Token<IUserEmailDirectory> = createToken('IUserEmailDirectory');
