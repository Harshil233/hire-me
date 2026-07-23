import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { APPLICATION_STATUSES, JOB_STATUSES } from '../../src/config/constants';
import { NotificationModel } from '../../src/database/models/notification.model';
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
let applicationId: string;

const JOB_PAYLOAD = {
  title: 'Senior Backend Engineer',
  description: 'Own the API from schema to production.',
  role: 'engineering',
  jobType: 'full_time',
  workMode: 'hybrid',
};

const setStatus = async (actor: RegisteredUser, status: string): Promise<void> => {
  await request(server.app)
    .patch(api(`/applications/${applicationId}/status`))
    .set('Authorization', bearer(actor))
    .send({ status })
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

  const created = await request(server.app)
    .post(api('/jobs'))
    .set('Authorization', bearer(hr))
    .send(JOB_PAYLOAD)
    .expect(201);
  jobId = created.body.data.job.id as string;

  await request(server.app)
    .patch(api(`/jobs/${jobId}/status`))
    .set('Authorization', bearer(hr))
    .send({ status: JOB_STATUSES.PUBLISHED })
    .expect(200);

  const applied = await request(server.app)
    .post(api(`/jobs/${jobId}/apply`))
    .set('Authorization', bearer(candidate))
    .send({})
    .expect(201);
  applicationId = applied.body.data.application.id as string;
});

describe('notification emission', () => {
  it('notifies the candidate when the employer shortlists them', async () => {
    await setStatus(hr, APPLICATION_STATUSES.SHORTLISTED);

    const response = await request(server.app)
      .get(api('/notifications'))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(response.body.data.notifications).toHaveLength(1);
    expect(response.body.data.notifications[0]).toMatchObject({
      type: 'application_status_changed',
      resourceKind: 'application',
      resourceId: applicationId,
      isRead: false,
    });
    expect(response.body.data.notifications[0].body).toContain('Senior Backend Engineer');
    expect(response.body.data.unreadCount).toBe(1);
  });

  it('records one notification per status change', async () => {
    await setStatus(hr, APPLICATION_STATUSES.SHORTLISTED);
    await setStatus(hr, APPLICATION_STATUSES.REJECTED);

    const response = await request(server.app)
      .get(api('/notifications'))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(response.body.data.notifications).toHaveLength(2);
    // Newest first.
    expect(response.body.data.notifications[0].title).toContain('rejected');
  });

  it('sends nothing to the employer, and nothing when the candidate withdraws', async () => {
    await setStatus(candidate, APPLICATION_STATUSES.WITHDRAWN);

    const hrInbox = await request(server.app)
      .get(api('/notifications'))
      .set('Authorization', bearer(hr))
      .expect(200);
    const candidateInbox = await request(server.app)
      .get(api('/notifications'))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(hrInbox.body.data.notifications).toEqual([]);
    expect(candidateInbox.body.data.notifications).toEqual([]);
    expect(await NotificationModel.countDocuments({})).toBe(0);
  });

  it('leaves no notification behind when the status change is refused', async () => {
    await request(server.app)
      .patch(api(`/applications/${applicationId}/status`))
      .set('Authorization', bearer(candidate))
      .send({ status: APPLICATION_STATUSES.SHORTLISTED })
      .expect(422);

    expect(await NotificationModel.countDocuments({})).toBe(0);
  });

  it('writes nothing when another company’s employer is refused', async () => {
    const rival = await registerHr(server.app, {
      email: 'rival@rival.test',
      company: { name: 'Rival Ltd' },
    });

    await request(server.app)
      .patch(api(`/applications/${applicationId}/status`))
      .set('Authorization', bearer(rival))
      .send({ status: APPLICATION_STATUSES.REJECTED })
      .expect(404);

    expect(await NotificationModel.countDocuments({})).toBe(0);
  });
});

describe('GET /notifications', () => {
  it('never returns another user’s notifications', async () => {
    await setStatus(hr, APPLICATION_STATUSES.SHORTLISTED);
    const other = await registerCandidate(server.app, { email: 'grace@example.com' });

    const response = await request(server.app)
      .get(api('/notifications'))
      .set('Authorization', bearer(other))
      .expect(200);

    expect(response.body.data.notifications).toEqual([]);
    expect(response.body.data.unreadCount).toBe(0);
  });

  it('does not disclose the owning user id', async () => {
    await setStatus(hr, APPLICATION_STATUSES.SHORTLISTED);

    const response = await request(server.app)
      .get(api('/notifications'))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(response.body.data.notifications[0]).not.toHaveProperty('userId');
  });

  it('requires authentication', async () => {
    await request(server.app).get(api('/notifications')).expect(401);
  });

  it('rejects a page size above the cap with 422', async () => {
    await request(server.app)
      .get(api('/notifications?pageSize=1000'))
      .set('Authorization', bearer(candidate))
      .expect(422);
  });
});

describe('PATCH /notifications/read', () => {
  beforeEach(async () => {
    await setStatus(hr, APPLICATION_STATUSES.SHORTLISTED);
    await setStatus(hr, APPLICATION_STATUSES.REJECTED);
  });

  it('marks everything read when no id is sent', async () => {
    const response = await request(server.app)
      .patch(api('/notifications/read'))
      .set('Authorization', bearer(candidate))
      .send({})
      .expect(200);

    expect(response.body.data.markedCount).toBe(2);

    const inbox = await request(server.app)
      .get(api('/notifications'))
      .set('Authorization', bearer(candidate))
      .expect(200);
    expect(inbox.body.data.unreadCount).toBe(0);
  });

  it('marks a single notification read', async () => {
    const inbox = await request(server.app)
      .get(api('/notifications'))
      .set('Authorization', bearer(candidate))
      .expect(200);
    const [first] = inbox.body.data.notifications as { id: string }[];

    const response = await request(server.app)
      .patch(api('/notifications/read'))
      .set('Authorization', bearer(candidate))
      .send({ id: first?.id })
      .expect(200);

    expect(response.body.data.markedCount).toBe(1);
  });

  it('cannot mark another user’s notification read', async () => {
    const inbox = await request(server.app)
      .get(api('/notifications'))
      .set('Authorization', bearer(candidate))
      .expect(200);
    const [first] = inbox.body.data.notifications as { id: string }[];
    const other = await registerCandidate(server.app, { email: 'grace@example.com' });

    const response = await request(server.app)
      .patch(api('/notifications/read'))
      .set('Authorization', bearer(other))
      .send({ id: first?.id })
      .expect(200);

    // Scoped to the caller, so it matches nothing rather than touching someone else's row.
    expect(response.body.data.markedCount).toBe(0);
    expect(await NotificationModel.countDocuments({ isRead: true })).toBe(0);
  });

  it('rejects a malformed id with 422', async () => {
    await request(server.app)
      .patch(api('/notifications/read'))
      .set('Authorization', bearer(candidate))
      .send({ id: 'not-an-id' })
      .expect(422);
  });
});
