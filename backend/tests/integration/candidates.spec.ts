import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ERROR_CODES } from '../../src/common/errors/error-codes';
import { JOB_STATUSES } from '../../src/config/constants';
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

const profileOf = async (user: RegisteredUser, patch: Record<string, unknown>): Promise<void> => {
  await request(server.app)
    .put(api('/profile'))
    .set('Authorization', bearer(user))
    .send(patch)
    .expect(200);
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
  await profileOf(candidate, {
    currentLocation: 'Pune',
    preferredLocations: ['Pune', 'Remote'],
    skills: ['TypeScript', 'Node.js'],
    jobTypes: ['full_time'],
  });
});

describe('GET /candidates', () => {
  it('lists the talent pool for an employer', async () => {
    const response = await request(server.app)
      .get(api('/candidates'))
      .set('Authorization', bearer(hr))
      .expect(200);

    expect(response.body.data.candidates).toHaveLength(1);
    expect(response.body.data.candidates[0]).toMatchObject({
      fullName: 'Ada Lovelace',
      currentLocation: 'Pune',
      skills: ['TypeScript', 'Node.js'],
    });
    expect(response.body.data.pagination).toMatchObject({ total: 1, totalPages: 1 });
  });

  it.each([['dob'], ['mobile'], ['expectedCtc'], ['currentCtc'], ['email']])(
    'does not disclose a candidate’s %s',
    async (field) => {
      await profileOf(candidate, { expectedCtc: 2_400_000, mobile: { countryCode: '+91', number: '9876543210' } });

      const response = await request(server.app)
        .get(api('/candidates'))
        .set('Authorization', bearer(hr))
        .expect(200);

      expect(response.body.data.candidates[0]).not.toHaveProperty(field);
    },
  );

  it('refuses a candidate with 403 — no enumerating each other', async () => {
    const response = await request(server.app)
      .get(api('/candidates'))
      .set('Authorization', bearer(candidate))
      .expect(403);

    expect(response.body.error.code).toBe(ERROR_CODES.ROLE_FORBIDDEN);
  });

  it('requires authentication', async () => {
    await request(server.app).get(api('/candidates')).expect(401);
  });

  it.each([
    ['search=ada', 1],
    ['search=lovelace', 1],
    ['search=typescript', 1],
    ['search=pune', 1],
    ['search=nobody', 0],
    ['skills=typescript', 1],
    ['skills=cobol', 0],
    ['location=pune', 1],
    ['location=berlin', 0],
    ['jobType=full_time', 1],
    ['jobType=internship', 0],
  ])('filters by %s', async (queryString, expected) => {
    const response = await request(server.app)
      .get(api(`/candidates?${queryString}`))
      .set('Authorization', bearer(hr))
      .expect(200);

    expect(response.body.data.candidates).toHaveLength(expected);
  });

  it('treats a regex metacharacter as a literal', async () => {
    const response = await request(server.app)
      .get(api('/candidates?location=.*'))
      .set('Authorization', bearer(hr))
      .expect(200);

    expect(response.body.data.candidates).toHaveLength(0);
  });

  it('rejects a page size above the cap with 422', async () => {
    await request(server.app)
      .get(api('/candidates?pageSize=1000'))
      .set('Authorization', bearer(hr))
      .expect(422);
  });
});

describe('GET /jobs — widened search', () => {
  beforeEach(async () => {
    const created = await request(server.app)
      .post(api('/jobs'))
      .set('Authorization', bearer(hr))
      .send({
        title: 'Senior Backend Engineer',
        description: 'Own the API end to end.',
        role: 'engineering',
        jobType: 'full_time',
        workMode: 'hybrid',
        skills: ['TypeScript'],
        locations: ['Pune'],
      })
      .expect(201);

    await request(server.app)
      .patch(api(`/jobs/${created.body.data.job.id}/status`))
      .set('Authorization', bearer(hr))
      .send({ status: JOB_STATUSES.PUBLISHED })
      .expect(200);
  });

  it.each([
    ['backend', 'the job title'],
    ['acme', 'the company name'],
    ['engineering', 'the role'],
    ['typescript', 'a skill'],
    ['pune', 'a location'],
    ['end to end', 'the description'],
  ])('finds the listing by searching "%s" (%s)', async (term) => {
    const response = await request(server.app)
      .get(api(`/jobs?search=${encodeURIComponent(term)}`))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(response.body.data.jobs).toHaveLength(1);
  });

  it('returns nothing for a term that matches none of those fields', async () => {
    const response = await request(server.app)
      .get(api('/jobs?search=zzzznotathing'))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(response.body.data.jobs).toEqual([]);
  });

  it('combines search with the other filters rather than replacing them', async () => {
    const matching = await request(server.app)
      .get(api('/jobs?search=backend&workMode=hybrid&minCtc=0'))
      .set('Authorization', bearer(candidate))
      .expect(200);
    const conflicting = await request(server.app)
      .get(api('/jobs?search=backend&workMode=remote'))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(matching.body.data.jobs).toHaveLength(1);
    expect(conflicting.body.data.jobs).toEqual([]);
  });
});
