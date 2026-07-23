import { describe, expect, it, vi } from 'vitest';

import type { IEmailSender } from '../../../common/email/email.types';
import { createFakeLogger } from '../../../../tests/helpers/fakes';
import type { ICandidateProfileService } from '../../candidate/candidate.interface';
import type { IJobService, JobWithCompany } from '../../job/job.interface';
import type { IUserService } from '../../user/user.interface';
import { OutreachDispatcher } from '../outreach.dispatcher';
import type {
  IOutreachRepository,
  IUserEmailDirectory,
  OutreachCampaign,
  OutreachRecipient,
} from '../outreach.interface';

const NOW = new Date('2026-07-01T10:00:00.000Z');

const CAMPAIGN: OutreachCampaign = {
  id: 'campaign-1',
  companyId: 'company-1',
  createdByUserId: 'hr-1',
  jobId: 'job-1',
  subject: 'A role for you',
  body: 'Hello {{firstName}}',
  status: 'sending',
  recipientCount: 1,
  sentCount: 0,
  failedCount: 0,
  skippedCount: 0,
  createdAt: NOW,
  updatedAt: NOW,
};

const recipient = (id: string, candidateUserId: string): OutreachRecipient => ({
  id,
  campaignId: 'campaign-1',
  candidateUserId,
  status: 'queued',
});

const JOB = {
  id: 'job-1',
  title: 'Senior Backend Engineer',
  company: { id: 'company-1', name: 'Nimbus Labs', slug: 'nimbus-labs' },
} as unknown as JobWithCompany;

interface Options {
  readonly recipients?: OutreachRecipient[];
  readonly claim?: OutreachCampaign | null;
  readonly emails?: Map<string, string>;
  readonly isOpenToOutreach?: boolean;
  readonly sendFails?: boolean;
}

const createHarness = (options: Options = {}) => {
  const repository = {
    createCampaign: vi.fn(),
    findCampaignById: vi.fn(async () => CAMPAIGN),
    listCampaignsForCompany: vi.fn(),
    addRecipients: vi.fn(),
    listRecipients: vi.fn(),
    claimNextQueuedCampaign: vi.fn(async () =>
      options.claim === undefined ? CAMPAIGN : options.claim,
    ),
    takeQueuedRecipients: vi.fn(async () => options.recipients ?? [recipient('r-1', 'cand-1')]),
    markRecipient: vi.fn(async () => undefined),
    refreshCampaignTotals: vi.fn(async () => CAMPAIGN),
    countRecipientsSince: vi.fn(async () => 0),
  } as unknown as IOutreachRepository;

  const emails: IUserEmailDirectory = {
    findEmails: vi.fn(async () => options.emails ?? new Map([['cand-1', 'ada@example.com']])),
  };

  const sender: IEmailSender = {
    send: vi.fn(async () => {
      if (options.sendFails === true) {
        throw new Error('provider down');
      }
    }),
  };

  const jobs = {
    findManyByIds: vi.fn(async () => new Map([['job-1', JOB]])),
  } as unknown as IJobService;

  const profiles = {
    getByUserId: vi.fn(async () => ({
      firstName: 'Ada',
      isOpenToOutreach: options.isOpenToOutreach ?? true,
    })),
  } as unknown as ICandidateProfileService;

  const users = {
    getById: vi.fn(async () => ({ email: 'grace@nimbuslabs.test' })),
  } as unknown as IUserService;

  const dispatcher = new OutreachDispatcher(
    repository,
    emails,
    sender,
    jobs,
    profiles,
    users,
    { appBaseUrl: 'https://app.test', unsubscribeSecret: 'a-secret-long-enough-for-hmac-use' },
    createFakeLogger(),
    () => NOW,
  );

  return { dispatcher, repository, sender };
};

describe('OutreachDispatcher', () => {
  it('does nothing when no campaign is waiting', async () => {
    const { dispatcher, sender } = createHarness({ claim: null });

    expect(await dispatcher.runOnce()).toBe(0);
    expect(sender.send).not.toHaveBeenCalled();
  });

  it('sends one message per recipient', async () => {
    const { dispatcher, sender } = createHarness({
      recipients: [recipient('r-1', 'cand-1'), recipient('r-2', 'cand-2')],
      emails: new Map([
        ['cand-1', 'ada@example.com'],
        ['cand-2', 'neel@example.com'],
      ]),
    });

    await dispatcher.runOnce();

    expect(sender.send).toHaveBeenCalledTimes(2);
    expect(vi.mocked(sender.send).mock.calls.map(([m]) => m.to)).toEqual([
      'ada@example.com',
      'neel@example.com',
    ]);
  });

  it('addresses the recruiter for replies and the company as the sender name', async () => {
    const { dispatcher, sender } = createHarness();

    await dispatcher.runOnce();

    expect(sender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: 'grace@nimbuslabs.test',
        fromName: expect.stringContaining('Nimbus Labs'),
      }),
    );
  });

  it('personalises the body before sending', async () => {
    const { dispatcher, sender } = createHarness();

    await dispatcher.runOnce();

    expect(vi.mocked(sender.send).mock.calls[0]?.[0].text).toContain('Hello Ada');
  });

  it('marks a delivered recipient as sent', async () => {
    const { dispatcher, repository } = createHarness();

    await dispatcher.runOnce();

    expect(repository.markRecipient).toHaveBeenCalledWith('r-1', 'sent', NOW);
  });

  it('skips somebody who opted out after being selected', async () => {
    const { dispatcher, repository, sender } = createHarness({ isOpenToOutreach: false });

    await dispatcher.runOnce();

    expect(sender.send).not.toHaveBeenCalled();
    expect(repository.markRecipient).toHaveBeenCalledWith('r-1', 'skipped', NOW);
  });

  it('skips a recipient whose address cannot be resolved', async () => {
    const { dispatcher, repository, sender } = createHarness({ emails: new Map() });

    await dispatcher.runOnce();

    expect(sender.send).not.toHaveBeenCalled();
    expect(repository.markRecipient).toHaveBeenCalledWith('r-1', 'skipped', NOW);
  });

  it('records a failure against the recipient rather than losing the batch', async () => {
    const { dispatcher, repository } = createHarness({
      sendFails: true,
      recipients: [recipient('r-1', 'cand-1'), recipient('r-2', 'cand-1')],
    });

    await dispatcher.runOnce();

    expect(repository.markRecipient).toHaveBeenCalledWith('r-1', 'failed', NOW, 'provider down');
    // The second recipient is still attempted.
    expect(repository.markRecipient).toHaveBeenCalledWith('r-2', 'failed', NOW, 'provider down');
  });

  it('settles the campaign totals after every batch', async () => {
    const { dispatcher, repository } = createHarness();

    await dispatcher.runOnce();

    expect(repository.refreshCampaignTotals).toHaveBeenCalledWith('campaign-1', NOW);
  });

  it('settles the totals when the queue for a claimed campaign is already empty', async () => {
    const { dispatcher, repository, sender } = createHarness({ recipients: [] });

    expect(await dispatcher.runOnce()).toBe(0);
    expect(sender.send).not.toHaveBeenCalled();
    expect(repository.refreshCampaignTotals).toHaveBeenCalled();
  });
});
