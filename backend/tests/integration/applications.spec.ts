import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ERROR_CODES } from '../../src/common/errors/error-codes';
import { APPLICATION_STATUSES, JOB_STATUSES } from '../../src/config/constants';
import { ApplicationModel } from '../../src/database/models/application.model';
import {
  api,
  bearer,
  registerCandidate,
  registerHr,
  type RegisteredUser,
} from '../helpers/api-client';
import { startTestServer, type TestServer } from '../helpers/test-server';

let server: TestServer;
let hr: RegisteredUser;
let candidate: RegisteredUser;
let jobId: string;

const JOB_PAYLOAD = {
  title: 'Senior Backend Engineer',
  description: 'Own the API from schema to production.',
  role: 'engineering',
  jobType: 'full_time',
  workMode: 'hybrid',
  skills: ['TypeScript'],
  locations: ['Pune'],
};

const postJob = async (
  owner: RegisteredUser,
  overrides: Record<string, unknown> = {},
  publish = true,
): Promise<string> => {
  const response = await request(server.app)
    .post(api('/jobs'))
    .set('Authorization', bearer(owner))
    .send({ ...JOB_PAYLOAD, ...overrides })
    .expect(201);

  const id = response.body.data.job.id as string;

  if (publish) {
    await request(server.app)
      .patch(api(`/jobs/${id}/status`))
      .set('Authorization', bearer(owner))
      .send({ status: JOB_STATUSES.PUBLISHED })
      .expect(200);
  }

  return id;
};

const apply = async (
  applicant: RegisteredUser,
  targetJobId: string,
  body: Record<string, unknown> = {},
): Promise<string> => {
  const response = await request(server.app)
    .post(api(`/jobs/${targetJobId}/apply`))
    .set('Authorization', bearer(applicant))
    .send(body)
    .expect(201);

  return response.body.data.application.id as string;
};

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.stop();
});

beforeEach(async () => {
  await server.reset();
  hr = await registerHr(server.app);
  candidate = await registerCandidate(server.app);
  jobId = await postJob(hr);
});

describe('POST /jobs/:id/apply', () => {
  it('records the application and returns it with the listing', async () => {
    const response = await request(server.app)
      .post(api(`/jobs/${jobId}/apply`))
      .set('Authorization', bearer(candidate))
      .send({ coverNote: 'Keen to join' })
      .expect(201);

    expect(response.body.data.application).toMatchObject({
      status: APPLICATION_STATUSES.APPLIED,
      coverNote: 'Keen to join',
      job: { id: jobId, title: 'Senior Backend Engineer' },
    });

    const stored = await ApplicationModel.findOne({}).lean();
    expect(stored?.candidateUserId.toHexString()).toBe(candidate.userId);
  });

  it('rejects a second application with 409, proving the unique index', async () => {
    await apply(candidate, jobId);

    const response = await request(server.app)
      .post(api(`/jobs/${jobId}/apply`))
      .set('Authorization', bearer(candidate))
      .send({})
      .expect(409);

    expect(response.body.error.code).toBe(ERROR_CODES.CONFLICT);
    expect(await ApplicationModel.countDocuments({})).toBe(1);
  });

  it('lets a different candidate apply to the same job', async () => {
    await apply(candidate, jobId);
    const other = await registerCandidate(server.app, { email: 'grace@example.com' });

    await apply(other, jobId);

    expect(await ApplicationModel.countDocuments({ jobId: jobId })).toBe(2);
  });

  it('refuses HR with 403', async () => {
    const response = await request(server.app)
      .post(api(`/jobs/${jobId}/apply`))
      .set('Authorization', bearer(hr))
      .send({})
      .expect(403);

    expect(response.body.error.code).toBe(ERROR_CODES.ROLE_FORBIDDEN);
  });

  it('requires authentication', async () => {
    await request(server.app).post(api(`/jobs/${jobId}/apply`)).send({}).expect(401);
  });

  it.each([
    ['a draft', JOB_STATUSES.DRAFT],
    ['a closed', JOB_STATUSES.CLOSED],
  ])('refuses to apply to %s listing', async (_label, status) => {
    const draftId = await postJob(hr, { title: 'Hidden role' }, false);

    if (status === JOB_STATUSES.CLOSED) {
      await request(server.app)
        .patch(api(`/jobs/${draftId}/status`))
        .set('Authorization', bearer(hr))
        .send({ status: JOB_STATUSES.PUBLISHED })
        .expect(200);
      await request(server.app)
        .patch(api(`/jobs/${draftId}/status`))
        .set('Authorization', bearer(hr))
        .send({ status: JOB_STATUSES.CLOSED })
        .expect(200);
    }

    const response = await request(server.app)
      .post(api(`/jobs/${draftId}/apply`))
      .set('Authorization', bearer(candidate))
      .send({});

    // A draft is invisible (404); a closed listing is visible but shut (422).
    expect([404, 422]).toContain(response.status);
    expect(await ApplicationModel.countDocuments({})).toBe(0);
  });

  it('answers 404 for a job that does not exist', async () => {
    await request(server.app)
      .post(api('/jobs/000000000000000000000099/apply'))
      .set('Authorization', bearer(candidate))
      .send({})
      .expect(404);
  });

  it('ignores a résumé or candidate id supplied in the body', async () => {
    await request(server.app)
      .post(api(`/jobs/${jobId}/apply`))
      .set('Authorization', bearer(candidate))
      .send({ resumeFileId: '000000000000000000000042', candidateUserId: hr.userId })
      .expect(201);

    const stored = await ApplicationModel.findOne({}).lean();
    expect(stored?.candidateUserId.toHexString()).toBe(candidate.userId);
    expect(stored?.resumeFileId).toBeUndefined();
  });
});

describe('GET /applications', () => {
  it('returns the candidate’s own applications with their listings', async () => {
    await apply(candidate, jobId);

    const response = await request(server.app)
      .get(api('/applications'))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(response.body.data.applications).toHaveLength(1);
    expect(response.body.data.applications[0].job.company.name).toBe('Acme Corp');
    expect(response.body.data.pagination).toMatchObject({ total: 1, totalPages: 1 });
  });

  it('never returns another candidate’s applications', async () => {
    await apply(candidate, jobId);
    const other = await registerCandidate(server.app, { email: 'grace@example.com' });

    const response = await request(server.app)
      .get(api('/applications'))
      .set('Authorization', bearer(other))
      .expect(200);

    expect(response.body.data.applications).toEqual([]);
  });

  it('still shows an application after its listing is closed', async () => {
    await apply(candidate, jobId);
    await request(server.app)
      .patch(api(`/jobs/${jobId}/status`))
      .set('Authorization', bearer(hr))
      .send({ status: JOB_STATUSES.CLOSED })
      .expect(200);

    const response = await request(server.app)
      .get(api('/applications'))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(response.body.data.applications[0].job.status).toBe(JOB_STATUSES.CLOSED);
  });

  it('refuses HR with 403', async () => {
    await request(server.app)
      .get(api('/applications'))
      .set('Authorization', bearer(hr))
      .expect(403);
  });

  it('rejects a page size above the cap with 422', async () => {
    await request(server.app)
      .get(api('/applications?pageSize=1000'))
      .set('Authorization', bearer(candidate))
      .expect(422);
  });
});

describe('GET /jobs/:id/applications', () => {
  it('lists applicants for the employer that owns the listing', async () => {
    await apply(candidate, jobId, { coverNote: 'Keen' });

    const response = await request(server.app)
      .get(api(`/jobs/${jobId}/applications`))
      .set('Authorization', bearer(hr))
      .expect(200);

    expect(response.body.data.applications).toHaveLength(1);
    expect(response.body.data.applications[0].candidate).toMatchObject({
      fullName: 'Ada Lovelace',
    });
  });

  it.each([['dob'], ['expectedCtc'], ['currentCtc'], ['mobile']])(
    'does not disclose the candidate’s %s',
    async (field) => {
      await apply(candidate, jobId);

      const response = await request(server.app)
        .get(api(`/jobs/${jobId}/applications`))
        .set('Authorization', bearer(hr))
        .expect(200);

      expect(response.body.data.applications[0].candidate).not.toHaveProperty(field);
    },
  );

  it('answers 404 for another company’s job, never 403', async () => {
    await apply(candidate, jobId);
    const rival = await registerHr(server.app, {
      email: 'rival@rival.test',
      company: { name: 'Rival Ltd' },
    });

    const response = await request(server.app)
      .get(api(`/jobs/${jobId}/applications`))
      .set('Authorization', bearer(rival))
      .expect(404);

    expect(response.body.error.code).toBe(ERROR_CODES.JOB_NOT_FOUND);
  });

  it('refuses a candidate with 403', async () => {
    await request(server.app)
      .get(api(`/jobs/${jobId}/applications`))
      .set('Authorization', bearer(candidate))
      .expect(403);
  });

  it('filters by status', async () => {
    await apply(candidate, jobId);

    const response = await request(server.app)
      .get(api(`/jobs/${jobId}/applications?status=shortlisted`))
      .set('Authorization', bearer(hr))
      .expect(200);

    expect(response.body.data.applications).toEqual([]);
  });
});

describe('PATCH /applications/:id/status', () => {
  let applicationId: string;

  beforeEach(async () => {
    applicationId = await apply(candidate, jobId);
  });

  it('lets the employer shortlist an applicant', async () => {
    const response = await request(server.app)
      .patch(api(`/applications/${applicationId}/status`))
      .set('Authorization', bearer(hr))
      .send({ status: APPLICATION_STATUSES.SHORTLISTED })
      .expect(200);

    expect(response.body.data.application.status).toBe(APPLICATION_STATUSES.SHORTLISTED);

    const stored = await ApplicationModel.findById(applicationId).lean();
    expect(stored?.statusUpdatedByUserId?.toHexString()).toBe(hr.userId);
  });

  it('shows the new status on the candidate’s own list', async () => {
    await request(server.app)
      .patch(api(`/applications/${applicationId}/status`))
      .set('Authorization', bearer(hr))
      .send({ status: APPLICATION_STATUSES.REJECTED })
      .expect(200);

    const response = await request(server.app)
      .get(api('/applications'))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(response.body.data.applications[0].status).toBe(APPLICATION_STATUSES.REJECTED);
  });

  it('lets the candidate withdraw', async () => {
    await request(server.app)
      .patch(api(`/applications/${applicationId}/status`))
      .set('Authorization', bearer(candidate))
      .send({ status: APPLICATION_STATUSES.WITHDRAWN })
      .expect(200);

    const stored = await ApplicationModel.findById(applicationId).lean();
    expect(stored?.status).toBe(APPLICATION_STATUSES.WITHDRAWN);
  });

  it('refuses a candidate shortlisting themselves with 422', async () => {
    const response = await request(server.app)
      .patch(api(`/applications/${applicationId}/status`))
      .set('Authorization', bearer(candidate))
      .send({ status: APPLICATION_STATUSES.SHORTLISTED })
      .expect(422);

    expect(response.body.error.code).toBe(ERROR_CODES.INVALID_STATUS_TRANSITION);
  });

  it('refuses an employer withdrawing on the candidate’s behalf with 422', async () => {
    await request(server.app)
      .patch(api(`/applications/${applicationId}/status`))
      .set('Authorization', bearer(hr))
      .send({ status: APPLICATION_STATUSES.WITHDRAWN })
      .expect(422);
  });

  it('answers 404 when another candidate targets the application', async () => {
    const other = await registerCandidate(server.app, { email: 'grace@example.com' });

    const response = await request(server.app)
      .patch(api(`/applications/${applicationId}/status`))
      .set('Authorization', bearer(other))
      .send({ status: APPLICATION_STATUSES.WITHDRAWN })
      .expect(404);

    expect(response.body.error.code).toBe(ERROR_CODES.APPLICATION_NOT_FOUND);
  });

  it('answers 404 when another company’s employer targets the application', async () => {
    const rival = await registerHr(server.app, {
      email: 'rival@rival.test',
      company: { name: 'Rival Ltd' },
    });

    await request(server.app)
      .patch(api(`/applications/${applicationId}/status`))
      .set('Authorization', bearer(rival))
      .send({ status: APPLICATION_STATUSES.REJECTED })
      .expect(404);
  });

  it('refuses an illegal transition out of withdrawn with 422', async () => {
    await request(server.app)
      .patch(api(`/applications/${applicationId}/status`))
      .set('Authorization', bearer(candidate))
      .send({ status: APPLICATION_STATUSES.WITHDRAWN })
      .expect(200);

    const response = await request(server.app)
      .patch(api(`/applications/${applicationId}/status`))
      .set('Authorization', bearer(hr))
      .send({ status: APPLICATION_STATUSES.SHORTLISTED })
      .expect(422);

    expect(response.body.error.code).toBe(ERROR_CODES.INVALID_STATUS_TRANSITION);
  });

  it('lets an employer reconsider a rejection', async () => {
    await request(server.app)
      .patch(api(`/applications/${applicationId}/status`))
      .set('Authorization', bearer(hr))
      .send({ status: APPLICATION_STATUSES.REJECTED })
      .expect(200);

    await request(server.app)
      .patch(api(`/applications/${applicationId}/status`))
      .set('Authorization', bearer(hr))
      .send({ status: APPLICATION_STATUSES.SHORTLISTED })
      .expect(200);
  });

  it('rejects an unknown status with 422', async () => {
    await request(server.app)
      .patch(api(`/applications/${applicationId}/status`))
      .set('Authorization', bearer(hr))
      .send({ status: 'hired' })
      .expect(422);
  });
});
