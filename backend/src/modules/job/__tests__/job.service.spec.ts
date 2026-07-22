import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JOB_STATUSES, PAGINATION } from '../../../config/constants';
import { ERROR_CODES } from '../../../common/errors/error-codes';
import type { ICompanyMembership } from '../../company/company.interface';
import type {
  CompanySummary,
  ICompanyDirectory,
  IJobRepository,
  Job,
} from '../job.interface';
import { JobService } from '../job.service';
import type { CreateJobInput, JobQueryInput } from '../job.schema';

const NOW = new Date('2026-03-01T10:00:00.000Z');

const COMPANY: CompanySummary = {
  id: 'company-1',
  name: 'Acme Corp',
  slug: 'acme-corp',
  logoFileId: undefined,
};

const JOB: Job = {
  id: 'job-1',
  companyId: 'company-1',
  postedByUserId: 'hr-1',
  title: 'Senior Backend Engineer',
  description: 'Build things',
  role: 'engineering',
  jobType: 'full_time',
  workMode: 'hybrid',
  skills: ['typescript'],
  locations: ['Pune'],
  status: JOB_STATUSES.PUBLISHED,
  publishedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
};

const CREATE_INPUT: CreateJobInput = {
  title: 'Senior Backend Engineer',
  description: 'Build things',
  role: 'engineering',
  jobType: 'full_time',
  workMode: 'hybrid',
  skills: ['typescript'],
  locations: ['Pune'],
};

const QUERY: JobQueryInput = {
  page: PAGINATION.DEFAULT_PAGE,
  pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
};

interface Harness {
  readonly service: JobService;
  readonly repository: IJobRepository;
  readonly membership: ICompanyMembership;
  readonly directory: ICompanyDirectory;
}

const createHarness = (): Harness => {
  const repository: IJobRepository = {
    findById: vi.fn(async () => JOB),
    search: vi.fn(async () => ({ items: [JOB], total: 1 })),
    create: vi.fn(async () => JOB),
    update: vi.fn(async () => JOB),
    setStatus: vi.fn(async () => JOB),
  };

  const membership: ICompanyMembership = {
    findCompanyIdForUser: vi.fn(async () => 'company-1'),
    attachCompany: vi.fn(async () => undefined),
    canManageCompany: vi.fn(async () => true),
  };

  const directory: ICompanyDirectory = {
    findSummaries: vi.fn(async () => new Map([[COMPANY.id, COMPANY]])),
  };

  return {
    service: new JobService(repository, membership, directory, () => NOW),
    repository,
    membership,
    directory,
  };
};

describe('JobService.create', () => {
  let harness: Harness;

  beforeEach(() => {
    harness = createHarness();
  });

  it('takes the company from the poster’s membership, never from the input', async () => {
    await harness.service.create('hr-1', {
      ...CREATE_INPUT,
      // A client trying to post under someone else's company.
      companyId: 'someone-elses-company',
      postedByUserId: 'someone-else',
    } as CreateJobInput);

    expect(harness.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 'company-1', postedByUserId: 'hr-1' }),
    );
  });

  it('refuses an HR that has not registered a company', async () => {
    vi.mocked(harness.membership.findCompanyIdForUser).mockResolvedValue(null);

    await expect(harness.service.create('hr-1', CREATE_INPUT)).rejects.toMatchObject({
      statusCode: 409,
      code: ERROR_CODES.HR_HAS_NO_COMPANY,
    });
    expect(harness.repository.create).not.toHaveBeenCalled();
  });

  it('returns the job with its company resolved', async () => {
    const created = await harness.service.create('hr-1', CREATE_INPUT);

    expect(created.company).toEqual(COMPANY);
  });
});

describe('JobService.browse', () => {
  it('forces the published filter regardless of what was asked for', async () => {
    const harness = createHarness();

    await harness.service.browse({ ...QUERY, role: 'design' });

    expect(harness.repository.search).toHaveBeenCalledWith(
      expect.objectContaining({ status: JOB_STATUSES.PUBLISHED, role: 'design' }),
      PAGINATION.DEFAULT_PAGE,
      PAGINATION.DEFAULT_PAGE_SIZE,
    );
  });

  it('never forwards the paging keys as filter fields', async () => {
    const harness = createHarness();

    await harness.service.browse(QUERY);

    const [filter] = vi.mocked(harness.repository.search).mock.calls[0] ?? [];
    expect(filter).not.toHaveProperty('page');
    expect(filter).not.toHaveProperty('pageSize');
  });

  it('returns pagination metadata alongside the jobs', async () => {
    const harness = createHarness();
    vi.mocked(harness.repository.search).mockResolvedValue({ items: [JOB], total: 45 });

    const result = await harness.service.browse({ ...QUERY, pageSize: 20 });

    expect(result.pagination).toEqual({ page: 1, pageSize: 20, total: 45, totalPages: 3 });
  });

  it('resolves companies in a single directory call for the whole page', async () => {
    const harness = createHarness();
    vi.mocked(harness.repository.search).mockResolvedValue({
      items: [JOB, { ...JOB, id: 'job-2' }, { ...JOB, id: 'job-3' }],
      total: 3,
    });

    await harness.service.browse(QUERY);

    expect(harness.directory.findSummaries).toHaveBeenCalledOnce();
  });

  it('does not hit the directory for an empty page', async () => {
    const harness = createHarness();
    vi.mocked(harness.repository.search).mockResolvedValue({ items: [], total: 0 });

    const result = await harness.service.browse(QUERY);

    expect(result.jobs).toEqual([]);
    expect(result.pagination.totalPages).toBe(1);
    expect(harness.directory.findSummaries).not.toHaveBeenCalled();
  });

  it('fails loudly when a job references a company that no longer exists', async () => {
    const harness = createHarness();
    vi.mocked(harness.directory.findSummaries).mockResolvedValue(new Map());

    await expect(harness.service.browse(QUERY)).rejects.toMatchObject({ statusCode: 500 });
  });
});

describe('JobService.listForHr', () => {
  it('scopes the list to the caller’s own company', async () => {
    const harness = createHarness();

    await harness.service.listForHr('hr-1', QUERY);

    expect(harness.repository.search).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 'company-1' }),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('leaves the status open so drafts are included by default', async () => {
    const harness = createHarness();

    await harness.service.listForHr('hr-1', QUERY);

    const [filter] = vi.mocked(harness.repository.search).mock.calls[0] ?? [];
    expect(filter).not.toHaveProperty('status');
  });

  it('honours an explicit status filter', async () => {
    const harness = createHarness();

    await harness.service.listForHr('hr-1', { ...QUERY, status: JOB_STATUSES.DRAFT });

    expect(harness.repository.search).toHaveBeenCalledWith(
      expect.objectContaining({ status: JOB_STATUSES.DRAFT }),
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('refuses an HR with no company', async () => {
    const harness = createHarness();
    vi.mocked(harness.membership.findCompanyIdForUser).mockResolvedValue(null);

    await expect(harness.service.listForHr('hr-1', QUERY)).rejects.toMatchObject({
      code: ERROR_CODES.HR_HAS_NO_COMPANY,
    });
  });
});

describe('JobService.getVisible', () => {
  it('shows a published job to anyone signed in', async () => {
    const harness = createHarness();
    vi.mocked(harness.membership.canManageCompany).mockResolvedValue(false);

    await expect(harness.service.getVisible('job-1', 'candidate-1')).resolves.toMatchObject({
      id: 'job-1',
    });
  });

  it.each([[JOB_STATUSES.DRAFT], [JOB_STATUSES.CLOSED]])(
    'hides a %s job from outside its company, as 404 rather than 403',
    async (status) => {
      const harness = createHarness();
      vi.mocked(harness.repository.findById).mockResolvedValue({ ...JOB, status });
      vi.mocked(harness.membership.canManageCompany).mockResolvedValue(false);

      await expect(harness.service.getVisible('job-1', 'candidate-1')).rejects.toMatchObject({
        statusCode: 404,
        code: ERROR_CODES.JOB_NOT_FOUND,
      });
    },
  );

  it('shows a draft to its own company', async () => {
    const harness = createHarness();
    vi.mocked(harness.repository.findById).mockResolvedValue({
      ...JOB,
      status: JOB_STATUSES.DRAFT,
    });

    await expect(harness.service.getVisible('job-1', 'hr-1')).resolves.toMatchObject({
      status: JOB_STATUSES.DRAFT,
    });
  });

  it('reports an unknown id as not found', async () => {
    const harness = createHarness();
    vi.mocked(harness.repository.findById).mockResolvedValue(null);

    await expect(harness.service.getVisible('job-1', 'hr-1')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('JobService.update', () => {
  it('updates a job owned by the caller’s company', async () => {
    const harness = createHarness();

    await harness.service.update('job-1', 'hr-1', { title: 'Staff Engineer' });

    expect(harness.repository.update).toHaveBeenCalledWith('job-1', { title: 'Staff Engineer' });
  });

  it('answers 404 for another company’s job', async () => {
    const harness = createHarness();
    vi.mocked(harness.membership.canManageCompany).mockResolvedValue(false);

    await expect(
      harness.service.update('job-1', 'other-hr', { title: 'Hijacked' }),
    ).rejects.toMatchObject({ statusCode: 404, code: ERROR_CODES.JOB_NOT_FOUND });
    expect(harness.repository.update).not.toHaveBeenCalled();
  });

  it('answers 404 when the row vanishes between the check and the write', async () => {
    const harness = createHarness();
    vi.mocked(harness.repository.update).mockResolvedValue(null);

    await expect(harness.service.update('job-1', 'hr-1', { title: 'x' })).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('JobService.changeStatus', () => {
  it('publishes a draft and stamps the clock', async () => {
    const harness = createHarness();
    vi.mocked(harness.repository.findById).mockResolvedValue({
      ...JOB,
      status: JOB_STATUSES.DRAFT,
    });

    await harness.service.changeStatus('job-1', 'hr-1', JOB_STATUSES.PUBLISHED);

    expect(harness.repository.setStatus).toHaveBeenCalledWith(
      'job-1',
      JOB_STATUSES.PUBLISHED,
      NOW,
    );
  });

  it('is a no-op when the status already matches', async () => {
    const harness = createHarness();

    const result = await harness.service.changeStatus('job-1', 'hr-1', JOB_STATUSES.PUBLISHED);

    expect(result.status).toBe(JOB_STATUSES.PUBLISHED);
    expect(harness.repository.setStatus).not.toHaveBeenCalled();
  });

  it('rejects a move that the transition table does not allow', async () => {
    const harness = createHarness();
    vi.mocked(harness.repository.findById).mockResolvedValue({
      ...JOB,
      status: JOB_STATUSES.PUBLISHED,
    });

    await expect(
      harness.service.changeStatus('job-1', 'hr-1', JOB_STATUSES.DRAFT),
    ).rejects.toMatchObject({
      statusCode: 422,
      code: ERROR_CODES.INVALID_STATUS_TRANSITION,
    });
    expect(harness.repository.setStatus).not.toHaveBeenCalled();
  });

  it('allows reopening a closed job', async () => {
    const harness = createHarness();
    vi.mocked(harness.repository.findById).mockResolvedValue({
      ...JOB,
      status: JOB_STATUSES.CLOSED,
    });

    await harness.service.changeStatus('job-1', 'hr-1', JOB_STATUSES.PUBLISHED);

    expect(harness.repository.setStatus).toHaveBeenCalled();
  });

  it('answers 404 for another company’s job', async () => {
    const harness = createHarness();
    vi.mocked(harness.membership.canManageCompany).mockResolvedValue(false);

    await expect(
      harness.service.changeStatus('job-1', 'other-hr', JOB_STATUSES.CLOSED),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('answers 404 when the row vanishes before the status write', async () => {
    const harness = createHarness();
    vi.mocked(harness.repository.findById).mockResolvedValue({
      ...JOB,
      status: JOB_STATUSES.DRAFT,
    });
    vi.mocked(harness.repository.setStatus).mockResolvedValue(null);

    await expect(
      harness.service.changeStatus('job-1', 'hr-1', JOB_STATUSES.PUBLISHED),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
