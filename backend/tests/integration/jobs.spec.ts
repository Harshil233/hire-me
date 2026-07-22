import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ERROR_CODES } from '../../src/common/errors/error-codes';
import { JOB_STATUSES } from '../../src/config/constants';
import { HrProfileModel } from '../../src/database/models/hr-profile.model';
import { JobModel } from '../../src/database/models/job.model';
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

const VALID_JOB = {
  title: 'Senior Backend Engineer',
  description: 'Own the API from schema to production.',
  role: 'engineering',
  jobType: 'full_time',
  workMode: 'hybrid',
  skills: ['TypeScript', 'MongoDB'],
  locations: ['Pune', 'Remote'],
  ctcMin: 1_800_000,
  ctcMax: 2_800_000,
  experienceMinYears: 4,
  experienceMaxYears: 8,
};

/** Creates a job and, unless told otherwise, publishes it so candidates can see it. */
const postJob = async (
  owner: RegisteredUser,
  overrides: Record<string, unknown> = {},
  publish = true,
): Promise<string> => {
  const response = await request(server.app)
    .post(api('/jobs'))
    .set('Authorization', bearer(owner))
    .send({ ...VALID_JOB, ...overrides })
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
});

describe('POST /jobs', () => {
  it('creates a draft owned by the poster’s company', async () => {
    const response = await request(server.app)
      .post(api('/jobs'))
      .set('Authorization', bearer(hr))
      .send(VALID_JOB)
      .expect(201);

    expect(response.body.data.job).toMatchObject({
      title: 'Senior Backend Engineer',
      status: JOB_STATUSES.DRAFT,
      company: { name: 'Acme Corp' },
    });

    const stored = await JobModel.findOne({}).lean();
    expect(stored?.postedByUserId.toHexString()).toBe(hr.userId);
  });

  it('ignores a companyId supplied in the body', async () => {
    const otherHr = await registerHr(server.app, {
      email: 'mallory@evil.test',
      company: { name: 'Evil Inc' },
    });

    const response = await request(server.app)
      .post(api('/jobs'))
      .set('Authorization', bearer(hr))
      .send({ ...VALID_JOB, companyId: '000000000000000000000099' })
      .expect(201);

    // The listing belongs to the poster's own company, not the injected id.
    expect(response.body.data.job.company.name).toBe('Acme Corp');
    expect(response.body.data.job.company.name).not.toBe('Evil Inc');
    expect(otherHr.userId).not.toBe(hr.userId);
  });

  it('refuses a candidate with 403', async () => {
    const response = await request(server.app)
      .post(api('/jobs'))
      .set('Authorization', bearer(candidate))
      .send(VALID_JOB)
      .expect(403);

    expect(response.body.error.code).toBe(ERROR_CODES.ROLE_FORBIDDEN);
  });

  it('refuses an unauthenticated request with 401', async () => {
    await request(server.app).post(api('/jobs')).send(VALID_JOB).expect(401);
  });

  it('rejects a CTC ceiling below the floor with 422', async () => {
    const response = await request(server.app)
      .post(api('/jobs'))
      .set('Authorization', bearer(hr))
      .send({ ...VALID_JOB, ctcMin: 3_000_000, ctcMax: 1_000_000 })
      .expect(422);

    expect(response.body.error.details.some((d: { field: string }) => d.field === 'ctcMax')).toBe(
      true,
    );
    expect(await JobModel.countDocuments({})).toBe(0);
  });

  it('rejects an unknown role with 422', async () => {
    await request(server.app)
      .post(api('/jobs'))
      .set('Authorization', bearer(hr))
      .send({ ...VALID_JOB, role: 'astrology' })
      .expect(422);
  });
});

describe('GET /jobs (browse)', () => {
  it('returns published jobs with pagination metadata', async () => {
    await postJob(hr);

    const response = await request(server.app)
      .get(api('/jobs'))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(response.body.data.jobs).toHaveLength(1);
    expect(response.body.data.pagination).toMatchObject({ page: 1, total: 1, totalPages: 1 });
    expect(response.body.data.jobs[0].company.name).toBe('Acme Corp');
  });

  it('hides drafts from candidates even when asked for by status', async () => {
    await postJob(hr, {}, false);

    const response = await request(server.app)
      .get(api('/jobs?status=draft'))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(response.body.data.jobs).toEqual([]);
  });

  it('hides closed jobs from the browse list', async () => {
    const id = await postJob(hr);
    await request(server.app)
      .patch(api(`/jobs/${id}/status`))
      .set('Authorization', bearer(hr))
      .send({ status: JOB_STATUSES.CLOSED })
      .expect(200);

    const response = await request(server.app)
      .get(api('/jobs'))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(response.body.data.jobs).toEqual([]);
  });

  it.each([
    ['role=engineering', 1],
    ['role=design', 0],
    ['jobType=full_time', 1],
    ['jobType=internship', 0],
    ['workMode=hybrid', 1],
    ['workMode=remote', 0],
    ['location=pune', 1],
    ['location=berlin', 0],
    ['skills=typescript', 1],
    ['skills=cobol', 0],
    ['minCtc=2000000', 1],
    ['minCtc=5000000', 0],
    ['maxExperienceYears=5', 1],
    ['maxExperienceYears=1', 0],
  ])('filters by %s', async (queryString, expected) => {
    await postJob(hr);

    const response = await request(server.app)
      .get(api(`/jobs?${queryString}`))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(response.body.data.jobs).toHaveLength(expected);
  });

  it('matches a location case-insensitively without treating it as a pattern', async () => {
    await postJob(hr);

    const exact = await request(server.app)
      .get(api('/jobs?location=PUNE'))
      .set('Authorization', bearer(candidate))
      .expect(200);
    const pattern = await request(server.app)
      .get(api('/jobs?location=.*'))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(exact.body.data.jobs).toHaveLength(1);
    // A regex metacharacter is matched literally, so it finds nothing.
    expect(pattern.body.data.jobs).toHaveLength(0);
  });

  /**
   * Express 5 parses the query string with the `simple` parser, so `role[$ne]=x` arrives
   * as the literal key `role[$ne]` rather than a nested `{ role: { $ne: x } }`. Zod then
   * drops the unknown key. The operator is therefore inert twice over: it never becomes
   * an object, and it never becomes a filter. (`job.schema.spec.ts` covers the second
   * layer directly, by handing the schema a real operator object.)
   */
  it.each([['role[$ne]=engineering'], ['minCtc[$gt]=0'], ['workMode[$regex]=.*']])(
    'treats the operator syntax %s as inert rather than as a filter',
    async (queryString) => {
      await postJob(hr);

      const response = await request(server.app)
        .get(api(`/jobs?${queryString}`))
        .set('Authorization', bearer(candidate))
        .expect(200);

      // Unfiltered: had the operator reached Mongo, `$ne`/`$regex` would have changed this.
      expect(response.body.data.jobs).toHaveLength(1);
    },
  );

  it('rejects an operator smuggled in as a scalar value with 422', async () => {
    await postJob(hr);

    await request(server.app)
      .get(api('/jobs?role=$ne'))
      .set('Authorization', bearer(candidate))
      .expect(422);
  });

  it('rejects a page size above the cap with 422', async () => {
    await request(server.app)
      .get(api('/jobs?pageSize=1000'))
      .set('Authorization', bearer(candidate))
      .expect(422);
  });

  it('pages through results', async () => {
    await postJob(hr, { title: 'Job A' });
    await postJob(hr, { title: 'Job B' });
    await postJob(hr, { title: 'Job C' });

    const page = await request(server.app)
      .get(api('/jobs?page=2&pageSize=2'))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(page.body.data.jobs).toHaveLength(1);
    expect(page.body.data.pagination).toMatchObject({
      page: 2,
      pageSize: 2,
      total: 3,
      totalPages: 2,
    });
  });

  it('requires authentication', async () => {
    await request(server.app).get(api('/jobs')).expect(401);
  });
});

describe('GET /jobs/mine', () => {
  it('lists the HR’s own postings including drafts', async () => {
    await postJob(hr, { title: 'Published one' });
    await postJob(hr, { title: 'Draft one' }, false);

    const response = await request(server.app)
      .get(api('/jobs/mine'))
      .set('Authorization', bearer(hr))
      .expect(200);

    expect(response.body.data.jobs).toHaveLength(2);
  });

  it('never leaks another company’s postings', async () => {
    await postJob(hr);
    const rival = await registerHr(server.app, {
      email: 'rival@rival.test',
      company: { name: 'Rival Ltd' },
    });

    const response = await request(server.app)
      .get(api('/jobs/mine'))
      .set('Authorization', bearer(rival))
      .expect(200);

    expect(response.body.data.jobs).toEqual([]);
  });

  it('refuses a candidate with 403', async () => {
    await request(server.app)
      .get(api('/jobs/mine'))
      .set('Authorization', bearer(candidate))
      .expect(403);
  });
});

describe('GET /jobs/:id', () => {
  it('shows a published job to a candidate', async () => {
    const id = await postJob(hr);

    const response = await request(server.app)
      .get(api(`/jobs/${id}`))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(response.body.data.job.id).toBe(id);
  });

  it('hides a draft from a candidate as 404, never 403', async () => {
    const id = await postJob(hr, {}, false);

    const response = await request(server.app)
      .get(api(`/jobs/${id}`))
      .set('Authorization', bearer(candidate))
      .expect(404);

    expect(response.body.error.code).toBe(ERROR_CODES.JOB_NOT_FOUND);
  });

  it('shows a draft to its own company', async () => {
    const id = await postJob(hr, {}, false);

    await request(server.app)
      .get(api(`/jobs/${id}`))
      .set('Authorization', bearer(hr))
      .expect(200);
  });

  it('rejects a malformed id with 422', async () => {
    await request(server.app)
      .get(api('/jobs/not-an-id'))
      .set('Authorization', bearer(candidate))
      .expect(422);
  });

  it('answers 404 for an id that does not exist', async () => {
    await request(server.app)
      .get(api('/jobs/000000000000000000000099'))
      .set('Authorization', bearer(candidate))
      .expect(404);
  });
});

describe('PUT /jobs/:id and PATCH /jobs/:id/status', () => {
  it('updates a job owned by the caller', async () => {
    const id = await postJob(hr);

    const response = await request(server.app)
      .put(api(`/jobs/${id}`))
      .set('Authorization', bearer(hr))
      .send({ title: 'Staff Backend Engineer' })
      .expect(200);

    expect(response.body.data.job.title).toBe('Staff Backend Engineer');
  });

  it('answers 404 when another company tries to edit the listing', async () => {
    const id = await postJob(hr);
    const rival = await registerHr(server.app, {
      email: 'rival@rival.test',
      company: { name: 'Rival Ltd' },
    });

    const response = await request(server.app)
      .put(api(`/jobs/${id}`))
      .set('Authorization', bearer(rival))
      .send({ title: 'Hijacked' })
      .expect(404);

    expect(response.body.error.code).toBe(ERROR_CODES.JOB_NOT_FOUND);
    expect((await JobModel.findById(id).lean())?.title).toBe('Senior Backend Engineer');
  });

  it('stamps publishedAt when a draft goes live', async () => {
    const id = await postJob(hr, {}, false);

    const response = await request(server.app)
      .patch(api(`/jobs/${id}/status`))
      .set('Authorization', bearer(hr))
      .send({ status: JOB_STATUSES.PUBLISHED })
      .expect(200);

    expect(response.body.data.job.publishedAt).toEqual(expect.any(String));
  });

  it('refuses an illegal transition with 422', async () => {
    const id = await postJob(hr);

    const response = await request(server.app)
      .patch(api(`/jobs/${id}/status`))
      .set('Authorization', bearer(hr))
      .send({ status: JOB_STATUSES.DRAFT })
      .expect(422);

    expect(response.body.error.code).toBe(ERROR_CODES.INVALID_STATUS_TRANSITION);
  });

  it('lets a closed job be reopened', async () => {
    const id = await postJob(hr);

    await request(server.app)
      .patch(api(`/jobs/${id}/status`))
      .set('Authorization', bearer(hr))
      .send({ status: JOB_STATUSES.CLOSED })
      .expect(200);

    await request(server.app)
      .patch(api(`/jobs/${id}/status`))
      .set('Authorization', bearer(hr))
      .send({ status: JOB_STATUSES.PUBLISHED })
      .expect(200);
  });

  it('refuses a candidate with 403', async () => {
    const id = await postJob(hr);

    await request(server.app)
      .patch(api(`/jobs/${id}/status`))
      .set('Authorization', bearer(candidate))
      .send({ status: JOB_STATUSES.CLOSED })
      .expect(403);
  });
});

describe('HR without a company', () => {
  it('is told to register one before posting', async () => {
    // A user is only ever HR-with-company through /hr/register, so drop the link
    // directly to reproduce the state /company/register exists to resolve.
    await HrProfileModel.updateOne({}, { $unset: { companyId: '' } });

    const response = await request(server.app)
      .post(api('/jobs'))
      .set('Authorization', bearer(hr))
      .send(VALID_JOB)
      .expect(409);

    expect(response.body.error.code).toBe(ERROR_CODES.HR_HAS_NO_COMPANY);
  });
});
