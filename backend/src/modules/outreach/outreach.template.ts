import type { JobWithCompany } from '../job/job.interface';
import { signUnsubscribeToken } from './unsubscribe-token';

export interface CampaignEmailInput {
  /** What the recruiter wrote, with `{{token}}` placeholders still in it. */
  readonly body: string;
  readonly firstName: string;
  readonly job: JobWithCompany;
  readonly candidateUserId: string;
  readonly appBaseUrl: string;
  readonly unsubscribeSecret: string;
}

/** What a recruiter may drop into their message, resolved per recipient. */
const tokensFor = (input: CampaignEmailInput): Readonly<Record<string, string>> => ({
  firstName: input.firstName,
  jobTitle: input.job.title,
  companyName: input.job.company.name,
});

/**
 * Fills the placeholders. Only the known tokens are replaced and the result is never
 * re-scanned, so a candidate whose name happens to read like `{{jobTitle}}` cannot cause
 * a second substitution.
 */
const merge = (template: string, tokens: Readonly<Record<string, string>>): string =>
  template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => tokens[key] ?? match);

/**
 * The message as it lands. The recruiter's words come first, then the listing it is about
 * and a link to it, then the unsubscribe line — which is not optional: a bulk email
 * without a way out is the definition of spam.
 */
export const renderCampaignEmail = (input: CampaignEmailInput): string => {
  const token = signUnsubscribeToken(input.candidateUserId, input.unsubscribeSecret);
  const base = input.appBaseUrl.replace(/\/+$/, '');
  const jobUrl = `${base}/jobs/${input.job.id}`;
  const unsubscribeUrl = `${base}/unsubscribe?u=${input.candidateUserId}&t=${token}`;

  return [
    merge(input.body, tokensFor(input)),
    '',
    '---',
    `${input.job.title} at ${input.job.company.name}`,
    `View the role: ${jobUrl}`,
    '',
    `You are receiving this because your profile is open to employer contact on Hire Me.`,
    `Stop receiving these: ${unsubscribeUrl}`,
  ].join('\n');
};
