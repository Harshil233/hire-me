import { describe, expect, it, vi } from 'vitest';

import { APPLICATION_STATUSES, JOB_STATUSES, ROLES } from '../../../config/constants';
import { createMockRequest, createMockResponse } from '../../../../tests/helpers/express-mocks';
import type { JobWithCompany } from '../../job/job.interface';
import { ApplicationController } from '../application.controller';
import type {
  ApplicationWithCandidate,
  ApplicationWithJob,
  IApplicationService,
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
  skills: [],
  locations: [],
  status: JOB_STATUSES.PUBLISHED,
  createdAt: NOW,
  updatedAt: NOW,
  company: { id: 'company-1', name: 'Acme Corp', slug: 'acme-corp', logoFileId: undefined },
};

const BASE = {
  id: 'application-1',
  jobId: 'job-1',
  candidateUserId: 'candidate-1',
  status: APPLICATION_STATUSES.APPLIED,
  statusUpdatedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
};

const WITH_JOB: ApplicationWithJob = { ...BASE, job: JOB };
const WITH_CANDIDATE: ApplicationWithCandidate = {
  ...BASE,
  candidate: {
    userId: 'candidate-1',
    fullName: 'Ada Lovelace',
    currentLocation: 'Pune',
    skills: ['TypeScript'],
    profilePicFileId: undefined,
  },
};

const PAGINATION_META = { page: 1, pageSize: 20, total: 1, totalPages: 1 };

const createController = (): {
  controller: ApplicationController;
  service: IApplicationService;
} => {
  const service: IApplicationService = {
    apply: vi.fn(async () => WITH_JOB),
    listMine: vi.fn(async () => ({ applications: [WITH_JOB], pagination: PAGINATION_META })),
    listAppliedJobIds: vi.fn(async () => ['job-1']),
    listForJob: vi.fn(async () => ({
      applications: [WITH_CANDIDATE],
      pagination: PAGINATION_META,
    })),
    changeStatus: vi.fn(async () => BASE),
  };

  return { controller: new ApplicationController(service), service };
};

describe('ApplicationController.apply', () => {
  it('answers 201 with the application and its job', async () => {
    const { controller } = createController();
    const res = createMockResponse();

    await controller.apply(
      createMockRequest({
        auth: { userId: 'candidate-1', role: ROLES.CANDIDATE },
        params: { id: 'job-1' },
        body: {},
      }),
      res,
    );

    expect(res.capturedStatus).toBe(201);
    expect(res.capturedBody).toMatchObject({
      data: { application: { id: 'application-1', job: { id: 'job-1' } } },
    });
  });

  it('takes the candidate from the token, not the body', async () => {
    const { controller, service } = createController();

    await controller.apply(
      createMockRequest({
        auth: { userId: 'candidate-1', role: ROLES.CANDIDATE },
        params: { id: 'job-1' },
        body: { candidateUserId: 'someone-else', coverNote: 'Hi' },
      }),
      createMockResponse(),
    );

    expect(service.apply).toHaveBeenCalledWith('job-1', 'candidate-1', {
      candidateUserId: 'someone-else',
      coverNote: 'Hi',
    });
  });
});

describe('ApplicationController.listMine', () => {
  it('scopes the list to the signed-in candidate', async () => {
    const { controller, service } = createController();

    await controller.listMine(
      createMockRequest({ auth: { userId: 'candidate-1', role: ROLES.CANDIDATE }, query: {} }),
      createMockResponse(),
    );

    expect(service.listMine).toHaveBeenCalledWith('candidate-1', {});
  });

  it('returns applications and pagination in the standard envelope', async () => {
    const { controller } = createController();
    const res = createMockResponse();

    await controller.listMine(
      createMockRequest({ auth: { userId: 'candidate-1', role: ROLES.CANDIDATE } }),
      res,
    );

    expect(res.capturedBody).toMatchObject({
      success: true,
      data: { applications: [{ id: 'application-1' }], pagination: PAGINATION_META },
    });
  });

  it('refuses without an authenticated identity', async () => {
    const { controller } = createController();

    await expect(
      controller.listMine(createMockRequest(), createMockResponse()),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe('ApplicationController.listForJob', () => {
  it('presents the applicant card rather than the whole profile', async () => {
    const { controller } = createController();
    const res = createMockResponse();

    await controller.listForJob(
      createMockRequest({
        auth: { userId: 'hr-1', role: ROLES.HR },
        params: { id: 'job-1' },
      }),
      res,
    );

    const body = res.capturedBody as { data: { applications: { candidate: object }[] } };
    expect(Object.keys(body.data.applications[0]?.candidate ?? {}).sort()).toEqual([
      'currentLocation',
      'fullName',
      'profilePicFileId',
      'skills',
      'userId',
    ]);
  });
});

describe('ApplicationController.changeStatus', () => {
  it('passes the role from the verified token through to the service', async () => {
    const { controller, service } = createController();

    await controller.changeStatus(
      createMockRequest({
        auth: { userId: 'hr-1', role: ROLES.HR },
        params: { id: 'application-1' },
        // A role in the body must be ignored entirely.
        body: { status: APPLICATION_STATUSES.SHORTLISTED, role: 'candidate' },
      }),
      createMockResponse(),
    );

    expect(service.changeStatus).toHaveBeenCalledWith(
      'application-1',
      'hr-1',
      ROLES.HR,
      APPLICATION_STATUSES.SHORTLISTED,
    );
  });

  it('answers with the new status only', async () => {
    const { controller } = createController();
    const res = createMockResponse();

    await controller.changeStatus(
      createMockRequest({
        auth: { userId: 'hr-1', role: ROLES.HR },
        params: { id: 'application-1' },
        body: { status: APPLICATION_STATUSES.SHORTLISTED },
      }),
      res,
    );

    expect(res.capturedBody).toEqual({
      success: true,
      data: { application: { id: 'application-1', status: APPLICATION_STATUSES.APPLIED } },
    });
  });

  it('answers the applied-listing lookup for the signed-in candidate only', async () => {
    const { controller, service } = createController();
    const res = createMockResponse();

    await controller.listMineJobIds(
      createMockRequest({ auth: { userId: 'candidate-1', role: ROLES.CANDIDATE } }),
      res,
    );

    expect(service.listAppliedJobIds).toHaveBeenCalledWith('candidate-1');
    expect(res.capturedBody).toMatchObject({ data: { jobIds: ['job-1'] } });
  });
});
