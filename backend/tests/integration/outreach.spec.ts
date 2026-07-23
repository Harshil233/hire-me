import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ERROR_CODES } from '../../src/common/errors/error-codes';
import { JOB_STATUSES } from '../../src/config/constants';
import { signUnsubscribeToken } from '../../src/modules/outreach/unsubscribe-token';
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

/** Matches the value `vitest.config.ts` pins, so a developer's own `.env` cannot break this. */
const UNSUBSCRIBE_SECRET = 'test-unsubscribe-secret-that-is-long-enough';

const publishJob = async (): Promise<string> => {
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

  const id = created.body.data.job.id as string;

  await request(server.app)
    .patch(api(`/jobs/${id}/status`))
    .set('Authorization', bearer(hr))
    .send({ status: JOB_STATUSES.PUBLISHED })
    .expect(200);

  return id;
};

const campaignBody = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  jobId,
  subject: 'A role that might suit you',
  body: 'Hi {{firstName}}, we are hiring.',
  audience: { kind: 'selection', candidateUserIds: [candidate.userId] },
  ...overrides,
});

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
  await request(server.app)
    .put(api('/profile'))
    .set('Authorization', bearer(candidate))
    .send({ skills: ['TypeScript'], currentLocation: 'Pune' })
    .expect(200);

  jobId = await publishJob();
});

describe('POST /outreach/campaigns', () => {
  it('creates a campaign for the selected candidates', async () => {
    const response = await request(server.app)
      .post(api('/outreach/campaigns'))
      .set('Authorization', bearer(hr))
      .send(campaignBody())
      .expect(201);

    expect(response.body.data.campaign).toMatchObject({
      jobId,
      subject: 'A role that might suit you',
      recipientCount: 1,
      status: 'queued',
    });
  });

  it('never returns a candidate email address', async () => {
    const response = await request(server.app)
      .post(api('/outreach/campaigns'))
      .set('Authorization', bearer(hr))
      .send(campaignBody())
      .expect(201);

    expect(JSON.stringify(response.body)).not.toContain(candidate.email);
  });

  it('resolves an audience from a filter, so "everyone matching" is one request', async () => {
    const response = await request(server.app)
      .post(api('/outreach/campaigns'))
      .set('Authorization', bearer(hr))
      .send(campaignBody({ audience: { kind: 'filter', filter: { skills: 'TypeScript' } } }))
      .expect(201);

    expect(response.body.data.campaign.recipientCount).toBe(1);
  });

  it('counts nobody for a filter that matches nobody', async () => {
    const response = await request(server.app)
      .post(api('/outreach/campaigns/preview'))
      .set('Authorization', bearer(hr))
      .send(campaignBody({ audience: { kind: 'filter', filter: { skills: 'COBOL' } } }))
      .expect(200);

    expect(response.body.data.recipientCount).toBe(0);
  });

  it('excludes a candidate who has opted out', async () => {
    await request(server.app)
      .put(api('/profile'))
      .set('Authorization', bearer(candidate))
      .send({ isOpenToOutreach: false })
      .expect(200);

    const response = await request(server.app)
      .post(api('/outreach/campaigns'))
      .set('Authorization', bearer(hr))
      .send(campaignBody())
      .expect(422);

    expect(response.body.error.message).toContain('can be contacted');
  });

  it('refuses a listing the company does not own', async () => {
    const other = await registerHr(server.app, {
      email: 'other@elsewhere.test',
      company: { name: 'Elsewhere Ltd' },
    });

    await request(server.app)
      .post(api('/outreach/campaigns'))
      .set('Authorization', bearer(other))
      .send(campaignBody())
      .expect(404);
  });

  it('refuses a candidate with 403 — outreach is an employer tool', async () => {
    const response = await request(server.app)
      .post(api('/outreach/campaigns'))
      .set('Authorization', bearer(candidate))
      .send(campaignBody())
      .expect(403);

    expect(response.body.error.code).toBe(ERROR_CODES.ROLE_FORBIDDEN);
  });

  it('requires authentication', async () => {
    await request(server.app).post(api('/outreach/campaigns')).send(campaignBody()).expect(401);
  });

  it('rejects an empty subject with 422', async () => {
    await request(server.app)
      .post(api('/outreach/campaigns'))
      .set('Authorization', bearer(hr))
      .send(campaignBody({ subject: '' }))
      .expect(422);
  });
});

describe('GET /outreach/campaigns', () => {
  it('lists the company’s own campaigns, newest first', async () => {
    await request(server.app)
      .post(api('/outreach/campaigns'))
      .set('Authorization', bearer(hr))
      .send(campaignBody())
      .expect(201);

    const response = await request(server.app)
      .get(api('/outreach/campaigns'))
      .set('Authorization', bearer(hr))
      .expect(200);

    expect(response.body.data.campaigns).toHaveLength(1);
    expect(response.body.data.pagination).toMatchObject({ total: 1 });
  });

  it('does not show another company’s campaigns', async () => {
    await request(server.app)
      .post(api('/outreach/campaigns'))
      .set('Authorization', bearer(hr))
      .send(campaignBody())
      .expect(201);

    const other = await registerHr(server.app, {
      email: 'other@elsewhere.test',
      company: { name: 'Elsewhere Ltd' },
    });

    const response = await request(server.app)
      .get(api('/outreach/campaigns'))
      .set('Authorization', bearer(other))
      .expect(200);

    expect(response.body.data.campaigns).toEqual([]);
  });

  it('reads one campaign back by id', async () => {
    const created = await request(server.app)
      .post(api('/outreach/campaigns'))
      .set('Authorization', bearer(hr))
      .send(campaignBody())
      .expect(201);

    const response = await request(server.app)
      .get(api(`/outreach/campaigns/${created.body.data.campaign.id as string}`))
      .set('Authorization', bearer(hr))
      .expect(200);

    expect(response.body.data.campaign.subject).toBe('A role that might suit you');
  });

  it('reports an unknown campaign as 404', async () => {
    await request(server.app)
      .get(api('/outreach/campaigns/64b7f1d2c9e77a0012345678'))
      .set('Authorization', bearer(hr))
      .expect(404);
  });
});

describe('POST /outreach/unsubscribe', () => {
  it('turns the preference off without any session', async () => {
    await request(server.app)
      .post(api('/outreach/unsubscribe'))
      .send({
        userId: candidate.userId,
        token: signUnsubscribeToken(candidate.userId, UNSUBSCRIBE_SECRET),
      })
      .expect(200);

    const profile = await request(server.app)
      .get(api('/profile'))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(profile.body.data.profile.isOpenToOutreach).toBe(false);
  });

  it('refuses a forged token', async () => {
    await request(server.app)
      .post(api('/outreach/unsubscribe'))
      .send({ userId: candidate.userId, token: 'nonsense' })
      .expect(403);
  });

  it('rejects a malformed user id with 422', async () => {
    await request(server.app)
      .post(api('/outreach/unsubscribe'))
      .send({ userId: 'not-an-id', token: 'x' })
      .expect(422);
  });
});
