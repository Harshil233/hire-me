import { describe, expect, it, vi } from 'vitest';

import { JOB_STATUSES, PAGINATION, ROLES } from '../../../config/constants';
import { createMockRequest, createMockResponse } from '../../../../tests/helpers/express-mocks';
import { JobController } from '../job.controller';
import type { IJobService, JobWithCompany } from '../job.interface';

const NOW = new Date('2026-03-01T10:00:00.000Z');
const AUTH = { userId: 'hr-1', role: ROLES.HR };

const JOB: JobWithCompany = {
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
  company: { id: 'company-1', name: 'Acme Corp', slug: 'acme-corp', logoFileId: undefined },
};

const PAGINATION_META = {
  page: PAGINATION.DEFAULT_PAGE,
  pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
  total: 1,
  totalPages: 1,
};

const createController = (): { controller: JobController; service: IJobService } => {
  const service: IJobService = {
    browse: vi.fn(async () => ({ jobs: [JOB], pagination: PAGINATION_META })),
    listForHr: vi.fn(async () => ({ jobs: [JOB], pagination: PAGINATION_META })),
    findManyByIds: vi.fn(async () => new Map([[JOB.id, JOB]])),
    getVisible: vi.fn(async () => JOB),
    create: vi.fn(async () => JOB),
    update: vi.fn(async () => JOB),
    changeStatus: vi.fn(async () => JOB),
  };

  return { controller: new JobController(service), service };
};

describe('JobController.browse', () => {
  it('returns jobs and pagination inside the standard envelope', async () => {
    const { controller } = createController();
    const res = createMockResponse();

    await controller.browse(createMockRequest({ query: { page: 1 } }), res);

    expect(res.capturedBody).toMatchObject({
      success: true,
      data: {
        jobs: [expect.objectContaining({ id: 'job-1', title: 'Senior Backend Engineer' })],
        pagination: PAGINATION_META,
      },
    });
  });

  it('serialises dates as ISO strings and nests the company summary', async () => {
    const { controller } = createController();
    const res = createMockResponse();

    await controller.browse(createMockRequest(), res);

    const body = res.capturedBody as { data: { jobs: { publishedAt: string; company: unknown }[] } };
    expect(body.data.jobs[0]?.publishedAt).toBe(NOW.toISOString());
    expect(body.data.jobs[0]?.company).toEqual({
      id: 'company-1',
      name: 'Acme Corp',
      slug: 'acme-corp',
      logoFileId: undefined,
    });
  });

  it('passes the validated query straight through', async () => {
    const { controller, service } = createController();

    await controller.browse(createMockRequest({ query: { page: 2, role: 'design' } }), createMockResponse());

    expect(service.browse).toHaveBeenCalledWith({ page: 2, role: 'design' });
  });
});

describe('JobController.listMine', () => {
  it('scopes the list to the signed-in HR', async () => {
    const { controller, service } = createController();

    await controller.listMine(createMockRequest({ auth: AUTH, query: {} }), createMockResponse());

    expect(service.listForHr).toHaveBeenCalledWith('hr-1', {});
  });

  it('refuses without an authenticated identity', async () => {
    const { controller } = createController();

    await expect(
      controller.listMine(createMockRequest(), createMockResponse()),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe('JobController.create', () => {
  it('answers 201 with the created job', async () => {
    const { controller } = createController();
    const res = createMockResponse();

    await controller.create(createMockRequest({ auth: AUTH, body: { title: 'x' } }), res);

    expect(res.capturedStatus).toBe(201);
    expect(res.capturedBody).toMatchObject({ data: { job: { id: 'job-1' } } });
  });

  it('passes only the caller id and body to the service, so the company cannot be spoofed', async () => {
    const { controller, service } = createController();
    const body = { title: 'x', companyId: 'someone-elses-company' };

    await controller.create(createMockRequest({ auth: AUTH, body }), createMockResponse());

    expect(service.create).toHaveBeenCalledWith('hr-1', body);
  });
});

describe('JobController.getById / update / changeStatus', () => {
  it('reads a job for the signed-in viewer', async () => {
    const { controller, service } = createController();

    await controller.getById(
      createMockRequest({ auth: AUTH, params: { id: 'job-1' } }),
      createMockResponse(),
    );

    expect(service.getVisible).toHaveBeenCalledWith('job-1', 'hr-1');
  });

  it('updates a job', async () => {
    const { controller, service } = createController();
    const res = createMockResponse();

    await controller.update(
      createMockRequest({ auth: AUTH, params: { id: 'job-1' }, body: { title: 'New' } }),
      res,
    );

    expect(service.update).toHaveBeenCalledWith('job-1', 'hr-1', { title: 'New' });
    expect(res.capturedStatus).toBe(200);
  });

  it('changes the status', async () => {
    const { controller, service } = createController();

    await controller.changeStatus(
      createMockRequest({
        auth: AUTH,
        params: { id: 'job-1' },
        body: { status: JOB_STATUSES.CLOSED },
      }),
      createMockResponse(),
    );

    expect(service.changeStatus).toHaveBeenCalledWith('job-1', 'hr-1', JOB_STATUSES.CLOSED);
  });
});
