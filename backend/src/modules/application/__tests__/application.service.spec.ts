import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  APPLICATION_STATUSES,
  JOB_STATUSES,
  PAGINATION,
  ROLES,
} from '../../../config/constants';
import { ERROR_CODES } from '../../../common/errors/error-codes';
import type {
  ITransactionManager,
  TransactionContext,
} from '../../../common/persistence/transaction.types';
import type { ICompanyMembership } from '../../company/company.interface';
import type { INotificationService } from '../../notification/notification.interface';
import type { ICandidateProfileService } from '../../candidate/candidate.interface';
import type { IJobService, IJobSummaryProvider, JobWithCompany } from '../../job/job.interface';
import { ApplicationService } from '../application.service';
import type {
  Application,
  CandidateSummary,
  IApplicationRepository,
  ICandidateDirectory,
} from '../application.interface';

const NOW = new Date('2026-03-05T10:00:00.000Z');

const JOB: JobWithCompany = {
  id: 'job-1',
  companyId: 'company-1',
  postedByUserId: 'hr-1',
  title: 'Senior Backend Engineer',
  description: 'Build things',
  highlights: [],
  responsibilities: [],
  qualifications: [],
  role: 'engineering',
  jobType: 'full_time',
  workMode: 'hybrid',
  skills: ['typescript'],
  locations: ['Pune'],
  status: JOB_STATUSES.PUBLISHED,
  createdAt: NOW,
  updatedAt: NOW,
  company: { id: 'company-1', name: 'Acme Corp', slug: 'acme-corp', logoFileId: undefined },
};

const APPLICATION: Application = {
  id: 'application-1',
  jobId: 'job-1',
  candidateUserId: 'candidate-1',
  status: APPLICATION_STATUSES.APPLIED,
  resumeFileId: 'file-1',
  statusUpdatedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
};

const CANDIDATE: CandidateSummary = {
  userId: 'candidate-1',
  fullName: 'Ada Lovelace',
  currentLocation: 'Pune',
  skills: ['TypeScript'],
  profilePicFileId: undefined,
};

const QUERY = { page: PAGINATION.DEFAULT_PAGE, pageSize: PAGINATION.DEFAULT_PAGE_SIZE };

const TEST_CONTEXT: TransactionContext = { transactionId: 'txn-1' };

interface Harness {
  readonly service: ApplicationService;
  readonly repository: IApplicationRepository;
  readonly jobService: IJobService;
  readonly jobSummaries: IJobSummaryProvider;
  readonly membership: ICompanyMembership;
  readonly candidateProfileService: ICandidateProfileService;
  readonly candidateDirectory: ICandidateDirectory;
  readonly notificationService: INotificationService;
  readonly transactionManager: ITransactionManager;
}

const createHarness = (): Harness => {
  const repository: IApplicationRepository = {
    findById: vi.fn(async () => APPLICATION),
    search: vi.fn(async () => ({ items: [APPLICATION], total: 1 })),
    create: vi.fn(async () => APPLICATION),
    setStatus: vi.fn(async () => APPLICATION),
  };

  const jobService = {
    getVisible: vi.fn(async () => JOB),
    findManyByIds: vi.fn(async () => new Map([[JOB.id, JOB]])),
    browse: vi.fn(),
    listForHr: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    changeStatus: vi.fn(),
  } as unknown as IJobService;

  const jobSummaries: IJobSummaryProvider = {
    findSummaryById: vi.fn(async () => ({
      id: JOB.id,
      companyId: JOB.companyId,
      status: JOB.status,
      title: JOB.title,
    })),
  };

  const membership: ICompanyMembership = {
    findCompanyIdForUser: vi.fn(async () => 'company-1'),
    attachCompany: vi.fn(async () => undefined),
    canManageCompany: vi.fn(async () => true),
  };

  const candidateProfileService = {
    getByUserId: vi.fn(async () => ({ resumeFileId: 'file-1' })),
    createForUser: vi.fn(),
    update: vi.fn(),
  } as unknown as ICandidateProfileService;

  const candidateDirectory: ICandidateDirectory = {
    findSummaries: vi.fn(async () => new Map([[CANDIDATE.userId, CANDIDATE]])),
  };

  const notificationService = {
    notify: vi.fn(async () => ({}) as never),
    list: vi.fn(),
    markRead: vi.fn(),
  } as unknown as INotificationService;

  const transactionManager: ITransactionManager = {
    runInTransaction: vi.fn(async (work) => work(TEST_CONTEXT)),
  };

  return {
    service: new ApplicationService({
      applicationRepository: repository,
      jobService,
      jobSummaries,
      membership,
      candidateProfileService,
      candidateDirectory,
      notificationService,
      transactionManager,
      now: () => NOW,
    }),
    repository,
    jobService,
    jobSummaries,
    membership,
    candidateProfileService,
    candidateDirectory,
    notificationService,
    transactionManager,
  };
};

describe('ApplicationService.apply', () => {
  let harness: Harness;

  beforeEach(() => {
    harness = createHarness();
  });

  it('records the application against the job and the candidate', async () => {
    await harness.service.apply('job-1', 'candidate-1', {});

    expect(harness.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-1',
        candidateUserId: 'candidate-1',
        statusUpdatedAt: NOW,
      }),
    );
  });

  it('snapshots the resume that is current at the moment of applying', async () => {
    await harness.service.apply('job-1', 'candidate-1', {});

    expect(harness.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ resumeFileId: 'file-1' }),
    );
  });

  it('applies without a resume when the candidate has not uploaded one', async () => {
    vi.mocked(harness.candidateProfileService.getByUserId).mockResolvedValue(
      {} as Awaited<ReturnType<ICandidateProfileService['getByUserId']>>,
    );

    await harness.service.apply('job-1', 'candidate-1', {});

    const [data] = vi.mocked(harness.repository.create).mock.calls[0] ?? [];
    expect(data).not.toHaveProperty('resumeFileId');
  });

  it('stores an optional cover note', async () => {
    await harness.service.apply('job-1', 'candidate-1', { coverNote: 'Keen to join' });

    expect(harness.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ coverNote: 'Keen to join' }),
    );
  });

  it.each([[JOB_STATUSES.DRAFT], [JOB_STATUSES.CLOSED]])(
    'refuses to apply to a %s listing',
    async (status) => {
      vi.mocked(harness.jobService.getVisible).mockResolvedValue({ ...JOB, status });

      await expect(harness.service.apply('job-1', 'candidate-1', {})).rejects.toMatchObject({
        statusCode: 422,
        code: ERROR_CODES.JOB_NOT_ACCEPTING_APPLICATIONS,
      });
      expect(harness.repository.create).not.toHaveBeenCalled();
    },
  );

  it('propagates the 404 for a listing the candidate cannot see', async () => {
    vi.mocked(harness.jobService.getVisible).mockRejectedValue(
      Object.assign(new Error('Job not found'), { statusCode: 404 }),
    );

    await expect(harness.service.apply('job-1', 'candidate-1', {})).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(harness.repository.create).not.toHaveBeenCalled();
  });

  it('returns the application with the job attached', async () => {
    const result = await harness.service.apply('job-1', 'candidate-1', {});

    expect(result.job.id).toBe('job-1');
    expect(result.status).toBe(APPLICATION_STATUSES.APPLIED);
  });
});

describe('ApplicationService.listMine', () => {
  it('scopes the search to the calling candidate', async () => {
    const harness = createHarness();

    await harness.service.listMine('candidate-1', QUERY);

    expect(harness.repository.search).toHaveBeenCalledWith(
      { candidateUserId: 'candidate-1' },
      PAGINATION.DEFAULT_PAGE,
      PAGINATION.DEFAULT_PAGE_SIZE,
    );
  });

  it('honours a status filter', async () => {
    const harness = createHarness();

    await harness.service.listMine('candidate-1', {
      ...QUERY,
      status: APPLICATION_STATUSES.SHORTLISTED,
    });

    expect(harness.repository.search).toHaveBeenCalledWith(
      expect.objectContaining({ status: APPLICATION_STATUSES.SHORTLISTED }),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('resolves the jobs in one batched call', async () => {
    const harness = createHarness();
    vi.mocked(harness.repository.search).mockResolvedValue({
      items: [APPLICATION, { ...APPLICATION, id: 'application-2' }],
      total: 2,
    });

    const result = await harness.service.listMine('candidate-1', QUERY);

    expect(harness.jobService.findManyByIds).toHaveBeenCalledOnce();
    expect(result.applications).toHaveLength(2);
  });

  it('returns an empty page without touching the job service', async () => {
    const harness = createHarness();
    vi.mocked(harness.repository.search).mockResolvedValue({ items: [], total: 0 });

    const result = await harness.service.listMine('candidate-1', QUERY);

    expect(result.applications).toEqual([]);
    expect(harness.jobService.findManyByIds).not.toHaveBeenCalled();
  });

  it('fails loudly when an application points at a job that no longer exists', async () => {
    const harness = createHarness();
    vi.mocked(harness.jobService.findManyByIds).mockResolvedValue(new Map());

    await expect(harness.service.listMine('candidate-1', QUERY)).rejects.toMatchObject({
      statusCode: 500,
    });
  });
});

describe('ApplicationService.listForJob', () => {
  it('returns applicants for a job the caller’s company owns', async () => {
    const harness = createHarness();

    const result = await harness.service.listForJob('job-1', 'hr-1', QUERY);

    expect(result.applications[0]?.candidate.fullName).toBe('Ada Lovelace');
    expect(harness.repository.search).toHaveBeenCalledWith(
      { jobId: 'job-1' },
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('answers 404 for another company’s job rather than 403', async () => {
    const harness = createHarness();
    vi.mocked(harness.membership.canManageCompany).mockResolvedValue(false);

    await expect(harness.service.listForJob('job-1', 'rival-hr', QUERY)).rejects.toMatchObject({
      statusCode: 404,
      code: ERROR_CODES.JOB_NOT_FOUND,
    });
    expect(harness.repository.search).not.toHaveBeenCalled();
  });

  it('answers 404 for a job that does not exist', async () => {
    const harness = createHarness();
    vi.mocked(harness.jobSummaries.findSummaryById).mockResolvedValue(null);

    await expect(harness.service.listForJob('job-1', 'hr-1', QUERY)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('exposes only the summary fields, never the whole candidate profile', async () => {
    const harness = createHarness();

    const result = await harness.service.listForJob('job-1', 'hr-1', QUERY);

    expect(Object.keys(result.applications[0]?.candidate ?? {}).sort()).toEqual([
      'currentLocation',
      'fullName',
      'profilePicFileId',
      'skills',
      'userId',
    ]);
  });
});

describe('ApplicationService.changeStatus', () => {
  let harness: Harness;

  beforeEach(() => {
    harness = createHarness();
  });

  it.each([[APPLICATION_STATUSES.SHORTLISTED], [APPLICATION_STATUSES.REJECTED]])(
    'lets the employer set %s',
    async (status) => {
      await harness.service.changeStatus('application-1', 'hr-1', ROLES.HR, status);

      expect(harness.repository.setStatus).toHaveBeenCalledWith(
        'application-1',
        status,
        'hr-1',
        NOW,
        TEST_CONTEXT,
      );
    },
  );

  it('lets the candidate withdraw their own application', async () => {
    await harness.service.changeStatus(
      'application-1',
      'candidate-1',
      ROLES.CANDIDATE,
      APPLICATION_STATUSES.WITHDRAWN,
    );

    expect(harness.repository.setStatus).toHaveBeenCalled();
  });

  it('refuses a candidate trying to shortlist themselves', async () => {
    await expect(
      harness.service.changeStatus(
        'application-1',
        'candidate-1',
        ROLES.CANDIDATE,
        APPLICATION_STATUSES.SHORTLISTED,
      ),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: ERROR_CODES.INVALID_STATUS_TRANSITION,
    });
    expect(harness.repository.setStatus).not.toHaveBeenCalled();
  });

  it('refuses an employer withdrawing on the candidate’s behalf', async () => {
    await expect(
      harness.service.changeStatus(
        'application-1',
        'hr-1',
        ROLES.HR,
        APPLICATION_STATUSES.WITHDRAWN,
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_STATUS_TRANSITION });
  });

  it('answers 404 when a candidate touches someone else’s application', async () => {
    await expect(
      harness.service.changeStatus(
        'application-1',
        'someone-else',
        ROLES.CANDIDATE,
        APPLICATION_STATUSES.WITHDRAWN,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: ERROR_CODES.APPLICATION_NOT_FOUND,
    });
    expect(harness.repository.setStatus).not.toHaveBeenCalled();
  });

  it('answers 404 when an employer touches another company’s application', async () => {
    vi.mocked(harness.membership.canManageCompany).mockResolvedValue(false);

    await expect(
      harness.service.changeStatus(
        'application-1',
        'rival-hr',
        ROLES.HR,
        APPLICATION_STATUSES.SHORTLISTED,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('answers 404 for an application that does not exist', async () => {
    vi.mocked(harness.repository.findById).mockResolvedValue(null);

    await expect(
      harness.service.changeStatus(
        'application-1',
        'hr-1',
        ROLES.HR,
        APPLICATION_STATUSES.SHORTLISTED,
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.APPLICATION_NOT_FOUND });
  });

  it('is a no-op when the status already matches', async () => {
    vi.mocked(harness.repository.findById).mockResolvedValue({
      ...APPLICATION,
      status: APPLICATION_STATUSES.SHORTLISTED,
    });

    const result = await harness.service.changeStatus(
      'application-1',
      'hr-1',
      ROLES.HR,
      APPLICATION_STATUSES.SHORTLISTED,
    );

    expect(result.status).toBe(APPLICATION_STATUSES.SHORTLISTED);
    expect(harness.repository.setStatus).not.toHaveBeenCalled();
  });

  it('refuses to move an application out of withdrawn', async () => {
    vi.mocked(harness.repository.findById).mockResolvedValue({
      ...APPLICATION,
      status: APPLICATION_STATUSES.WITHDRAWN,
    });

    await expect(
      harness.service.changeStatus(
        'application-1',
        'hr-1',
        ROLES.HR,
        APPLICATION_STATUSES.SHORTLISTED,
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.INVALID_STATUS_TRANSITION });
  });

  it('lets an employer reconsider a rejection', async () => {
    vi.mocked(harness.repository.findById).mockResolvedValue({
      ...APPLICATION,
      status: APPLICATION_STATUSES.REJECTED,
    });

    await harness.service.changeStatus(
      'application-1',
      'hr-1',
      ROLES.HR,
      APPLICATION_STATUSES.SHORTLISTED,
    );

    expect(harness.repository.setStatus).toHaveBeenCalled();
  });

  it('answers 404 when the row vanishes before the write', async () => {
    vi.mocked(harness.repository.setStatus).mockResolvedValue(null);

    await expect(
      harness.service.changeStatus(
        'application-1',
        'hr-1',
        ROLES.HR,
        APPLICATION_STATUSES.SHORTLISTED,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('ApplicationService.changeStatus — notifications', () => {
  let harness: Harness;

  beforeEach(() => {
    harness = createHarness();
  });

  it('tells the candidate when the employer changes their status', async () => {
    await harness.service.changeStatus(
      'application-1',
      'hr-1',
      ROLES.HR,
      APPLICATION_STATUSES.SHORTLISTED,
    );

    expect(harness.notificationService.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'candidate-1',
        type: 'application_status_changed',
        resourceKind: 'application',
        resourceId: 'application-1',
      }),
      TEST_CONTEXT,
    );
  });

  it('names the role in the notification body', async () => {
    await harness.service.changeStatus(
      'application-1',
      'hr-1',
      ROLES.HR,
      APPLICATION_STATUSES.REJECTED,
    );

    const [payload] = vi.mocked(harness.notificationService.notify).mock.calls[0] ?? [];
    expect(payload?.body).toContain('Senior Backend Engineer');
    expect(payload?.title).toContain(APPLICATION_STATUSES.REJECTED);
  });

  it('writes the status and the notification in one transaction', async () => {
    await harness.service.changeStatus(
      'application-1',
      'hr-1',
      ROLES.HR,
      APPLICATION_STATUSES.SHORTLISTED,
    );

    expect(harness.transactionManager.runInTransaction).toHaveBeenCalledOnce();
    // Both writes receive the same context, so they commit or roll back together.
    expect(harness.repository.setStatus).toHaveBeenCalledWith(
      'application-1',
      APPLICATION_STATUSES.SHORTLISTED,
      'hr-1',
      NOW,
      TEST_CONTEXT,
    );
    expect(harness.notificationService.notify).toHaveBeenCalledWith(
      expect.anything(),
      TEST_CONTEXT,
    );
  });

  it('does not notify the candidate about their own withdrawal', async () => {
    await harness.service.changeStatus(
      'application-1',
      'candidate-1',
      ROLES.CANDIDATE,
      APPLICATION_STATUSES.WITHDRAWN,
    );

    expect(harness.notificationService.notify).not.toHaveBeenCalled();
  });

  it('resolves the job once, reusing the summary authorisation already loaded', async () => {
    await harness.service.changeStatus(
      'application-1',
      'hr-1',
      ROLES.HR,
      APPLICATION_STATUSES.SHORTLISTED,
    );

    expect(harness.jobSummaries.findSummaryById).toHaveBeenCalledOnce();
  });

  it('sends no notification when the status write finds nothing', async () => {
    vi.mocked(harness.repository.setStatus).mockResolvedValue(null);

    await expect(
      harness.service.changeStatus(
        'application-1',
        'hr-1',
        ROLES.HR,
        APPLICATION_STATUSES.SHORTLISTED,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(harness.notificationService.notify).not.toHaveBeenCalled();
  });

  it('sends no notification for a no-op status change', async () => {
    vi.mocked(harness.repository.findById).mockResolvedValue({
      ...APPLICATION,
      status: APPLICATION_STATUSES.SHORTLISTED,
    });

    await harness.service.changeStatus(
      'application-1',
      'hr-1',
      ROLES.HR,
      APPLICATION_STATUSES.SHORTLISTED,
    );

    expect(harness.notificationService.notify).not.toHaveBeenCalled();
    expect(harness.transactionManager.runInTransaction).not.toHaveBeenCalled();
  });
});
