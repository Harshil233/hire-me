import { describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '../../../common/errors/error-codes';
import type { ICompanyMembership } from '../../company/company.interface';
import type { IJobSummaryProvider } from '../../job/job.interface';
import type { ICandidateProfileService } from '../../candidate/candidate.interface';
import { OutreachService } from '../outreach.service';
import { signUnsubscribeToken } from '../unsubscribe-token';
import type {
  ICandidateAudience,
  IOutreachRepository,
  OutreachCampaign,
} from '../outreach.interface';
import type { CreateCampaignInput } from '../outreach.schema';

const NOW = new Date('2026-07-01T10:00:00.000Z');
const SECRET = 'a-test-unsubscribe-secret-long-enough';

const CAMPAIGN: OutreachCampaign = {
  id: 'campaign-1',
  companyId: 'company-1',
  createdByUserId: 'hr-1',
  jobId: 'job-1',
  subject: 'A role for you',
  body: 'Hello {{firstName}}',
  status: 'queued',
  recipientCount: 2,
  sentCount: 0,
  failedCount: 0,
  skippedCount: 0,
  createdAt: NOW,
  updatedAt: NOW,
};

const INPUT: CreateCampaignInput = {
  jobId: 'job-1',
  subject: 'A role for you',
  body: 'Hello {{firstName}}',
  audience: { kind: 'selection', candidateUserIds: ['cand-1', 'cand-2'] },
};

interface Harness {
  readonly service: OutreachService;
  readonly repository: IOutreachRepository;
  readonly audience: ICandidateAudience;
  readonly profiles: ICandidateProfileService;
}

interface HarnessOptions {
  readonly dailyLimit?: number;
  readonly maxRecipients?: number;
  readonly job?: IJobSummaryProvider;
}

const createHarness = (overrides: HarnessOptions = {}): Harness => {
  const repository = {
    createCampaign: vi.fn(async () => CAMPAIGN),
    findCampaignById: vi.fn(async () => CAMPAIGN),
    listCampaignsForCompany: vi.fn(async () => ({ items: [CAMPAIGN], total: 1 })),
    addRecipients: vi.fn(async () => 2),
    listRecipients: vi.fn(async () => []),
    claimNextQueuedCampaign: vi.fn(async () => null),
    takeQueuedRecipients: vi.fn(async () => []),
    markRecipient: vi.fn(async () => undefined),
    refreshCampaignTotals: vi.fn(async () => CAMPAIGN),
    countRecipientsSince: vi.fn(async () => 0),
  } satisfies IOutreachRepository;

  const membership = {
    findCompanyIdForUser: vi.fn(async () => 'company-1'),
    canManageCompany: vi.fn(async () => true),
    attachCompany: vi.fn(async () => undefined),
  } as unknown as ICompanyMembership;

  const jobs: IJobSummaryProvider = overrides.job ?? {
    findSummaryById: vi.fn(async () => ({
      id: 'job-1',
      companyId: 'company-1',
      status: 'published' as const,
      title: 'Senior Backend Engineer',
    })),
  };

  const audience: ICandidateAudience = {
    findByFilter: vi.fn(async () => [
      { userId: 'cand-1', firstName: 'Ada' },
      { userId: 'cand-2', firstName: 'Neel' },
    ]),
    findByUserIds: vi.fn(async () => [
      { userId: 'cand-1', firstName: 'Ada' },
      { userId: 'cand-2', firstName: 'Neel' },
    ]),
  };

  const profiles = { update: vi.fn(async () => ({}) as never) } as unknown as ICandidateProfileService;

  const service = new OutreachService(
    repository,
    membership,
    jobs,
    audience,
    profiles,
    {
      maxRecipients: overrides.maxRecipients ?? 200,
      dailyLimit: overrides.dailyLimit ?? 500,
      unsubscribeSecret: SECRET,
    },
    () => NOW,
  );

  return { service, repository, audience, profiles };
};

describe('OutreachService.createCampaign', () => {
  it('records the campaign and queues one row per recipient', async () => {
    const { service, repository } = createHarness();

    await service.createCampaign('hr-1', INPUT);

    expect(repository.createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-1', companyId: 'company-1', recipientCount: 2 }),
    );
    expect(repository.addRecipients).toHaveBeenCalledWith('campaign-1', ['cand-1', 'cand-2']);
  });

  it('resolves a filter audience server-side rather than trusting a list of people', async () => {
    const { service, audience } = createHarness();

    await service.createCampaign('hr-1', {
      ...INPUT,
      audience: { kind: 'filter', filter: { skills: ['TypeScript'] } },
    });

    expect(audience.findByFilter).toHaveBeenCalledWith({ skills: ['TypeScript'] }, 200);
  });

  it('refuses a listing belonging to another company', async () => {
    const { service } = createHarness({
      job: { findSummaryById: vi.fn(async () => null) },
    });

    await expect(service.createCampaign('hr-1', INPUT)).rejects.toMatchObject({
      statusCode: 404,
      code: ERROR_CODES.JOB_NOT_FOUND,
    });
  });

  it('refuses to advertise a listing that is not published', async () => {
    const { service } = createHarness({
      job: {
        findSummaryById: vi.fn(async () => ({
          id: 'job-1',
          companyId: 'company-1',
          status: 'draft' as const,
          title: 'Draft',
        })),
      },
    });

    await expect(service.createCampaign('hr-1', INPUT)).rejects.toMatchObject({ statusCode: 422 });
  });

  it('refuses when everyone in the selection has opted out', async () => {
    const { service, audience } = createHarness();
    vi.mocked(audience.findByUserIds).mockResolvedValue([]);

    await expect(service.createCampaign('hr-1', INPUT)).rejects.toMatchObject({
      statusCode: 422,
    });
  });

  it('sends nothing once the company has hit its daily limit', async () => {
    const { service, repository } = createHarness({ dailyLimit: 3 });
    vi.mocked(repository.countRecipientsSince).mockResolvedValue(2);

    await expect(service.createCampaign('hr-1', INPUT)).rejects.toMatchObject({
      statusCode: 409,
      code: ERROR_CODES.RATE_LIMITED,
    });
    expect(repository.createCampaign).not.toHaveBeenCalled();
  });

  it('counts the day from a rolling window, not a calendar day', async () => {
    const { service, repository } = createHarness();

    await service.createCampaign('hr-1', INPUT);

    const [, since] = vi.mocked(repository.countRecipientsSince).mock.calls[0] ?? [];
    expect(since).toEqual(new Date('2026-06-30T10:00:00.000Z'));
  });

  it('caps a single campaign', async () => {
    const { service, audience } = createHarness({ maxRecipients: 1 });
    vi.mocked(audience.findByUserIds).mockResolvedValue([
      { userId: 'a', firstName: 'A' },
      { userId: 'b', firstName: 'B' },
    ]);

    await expect(service.createCampaign('hr-1', INPUT)).rejects.toMatchObject({ statusCode: 422 });
  });
});

describe('OutreachService.getCampaign', () => {
  it('reports another company’s campaign as missing rather than forbidden', async () => {
    const { service, repository } = createHarness();
    vi.mocked(repository.findCampaignById).mockResolvedValue({
      ...CAMPAIGN,
      companyId: 'someone-else',
    });

    await expect(service.getCampaign('campaign-1', 'hr-1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('returns the company’s own campaign', async () => {
    const { service } = createHarness();

    await expect(service.getCampaign('campaign-1', 'hr-1')).resolves.toEqual(CAMPAIGN);
  });
});

describe('OutreachService.unsubscribe', () => {
  it('turns the preference off for a correctly signed link', async () => {
    const { service, profiles } = createHarness();

    await service.unsubscribe('cand-1', signUnsubscribeToken('cand-1', SECRET));

    expect(profiles.update).toHaveBeenCalledWith('cand-1', { isOpenToOutreach: false });
  });

  it('refuses a forged token', async () => {
    const { service, profiles } = createHarness();

    await expect(service.unsubscribe('cand-1', 'not-the-token')).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(profiles.update).not.toHaveBeenCalled();
  });

  it('refuses a token signed for somebody else', async () => {
    const { service } = createHarness();

    await expect(
      service.unsubscribe('cand-1', signUnsubscribeToken('cand-2', SECRET)),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
