import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { ERROR_CODES } from '../../src/common/errors/error-codes';
import { api, bearer, registerCandidate, registerHr, type RegisteredUser } from '../helpers/api-client';
import { startTestServer, type TestServer } from '../helpers/test-server';

let server: TestServer;
let candidate: RegisteredUser;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.stop();
});

beforeEach(async () => {
  await server.reset();
  candidate = await registerCandidate(server.app);
});

/** The four sections share one implementation, so they are exercised through one table. */
const SECTIONS = [
  {
    path: '/experience',
    plural: 'experiences',
    singular: 'experience',
    valid: {
      title: 'Backend Engineer',
      companyName: 'Acme',
      startDate: '2021-01-01',
      endDate: '2023-01-01',
      skills: ['TypeScript'],
    },
    update: {
      title: 'Senior Backend Engineer',
      companyName: 'Acme',
      startDate: '2021-01-01',
      isCurrent: true,
      skills: ['TypeScript', 'Go'],
    },
    invalid: { title: '', companyName: 'Acme', startDate: '2021-01-01' },
    identity: (body: Record<string, unknown>): unknown => body.title,
  },
  {
    path: '/education',
    plural: 'educations',
    singular: 'education',
    valid: {
      college: 'IIT Bombay',
      course: 'Computer Science',
      degree: 'B.Tech',
      startDate: '2016-07-01',
      endDate: '2020-06-01',
    },
    update: {
      college: 'IIT Bombay',
      course: 'Computer Science',
      degree: 'M.Tech',
      startDate: '2016-07-01',
      isCurrent: true,
    },
    invalid: { college: 'IIT', course: 'CS', degree: 'B.Tech', startDate: 'not-a-date' },
    identity: (body: Record<string, unknown>): unknown => body.degree,
  },
  {
    path: '/certification',
    plural: 'certifications',
    singular: 'certification',
    valid: {
      title: 'AWS Solutions Architect',
      issuedBy: 'Amazon',
      issuedOn: '2023-05-01',
      expiresOn: '2026-05-01',
      credentialUrl: 'https://credly.test/badge/1',
    },
    update: { title: 'AWS SA Professional', issuedBy: 'Amazon', issuedOn: '2023-05-01' },
    invalid: { title: 'AWS', issuedBy: 'Amazon', issuedOn: '2023-05-01', expiresOn: '2022-01-01' },
    identity: (body: Record<string, unknown>): unknown => body.title,
  },
  {
    path: '/project',
    plural: 'projects',
    singular: 'project',
    valid: {
      title: 'Job portal',
      description: 'A hiring platform',
      skills: ['React'],
      link: 'https://github.test/hire-me',
      startDate: '2024-01-01',
      endDate: '2024-06-01',
    },
    update: { title: 'Job portal v2', skills: ['React', 'Node'], startDate: '2024-01-01' },
    invalid: { title: 'Job portal', startDate: '2024-01-01', link: 'not-a-url' },
    identity: (body: Record<string, unknown>): unknown => body.title,
  },
] as const;

describe.each(SECTIONS)('$path', (section) => {
  const create = async (
    user: RegisteredUser,
    payload: object = section.valid,
  ): Promise<Record<string, unknown>> => {
    const response = await request(server.app)
      .post(api(section.path))
      .set('Authorization', bearer(user))
      .send(payload)
      .expect(201);

    return response.body.data[section.singular] as Record<string, unknown>;
  };

  it('starts empty', async () => {
    const response = await request(server.app)
      .get(api(section.path))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(response.body.data[section.plural]).toEqual([]);
  });

  it('creates a record and lists it back', async () => {
    const created = await create(candidate);

    const response = await request(server.app)
      .get(api(section.path))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(response.body.data[section.plural]).toHaveLength(1);
    expect(section.identity(response.body.data[section.plural][0])).toBe(
      section.identity(created),
    );
  });

  it('replaces the record on update, clearing omitted optional fields', async () => {
    const created = await create(candidate);

    const response = await request(server.app)
      .put(api(`${section.path}/${created.id as string}`))
      .set('Authorization', bearer(candidate))
      .send(section.update)
      .expect(200);

    const updated = response.body.data[section.singular] as Record<string, unknown>;
    expect(section.identity(updated)).toBe(section.identity(section.update as never));
    expect(updated.id).toBe(created.id);
  });

  it('deletes the record', async () => {
    const created = await create(candidate);

    await request(server.app)
      .delete(api(`${section.path}/${created.id as string}`))
      .set('Authorization', bearer(candidate))
      .expect(204);

    const response = await request(server.app)
      .get(api(section.path))
      .set('Authorization', bearer(candidate))
      .expect(200);
    expect(response.body.data[section.plural]).toEqual([]);
  });

  it('rejects an invalid payload with 422', async () => {
    await request(server.app)
      .post(api(section.path))
      .set('Authorization', bearer(candidate))
      .send(section.invalid)
      .expect(422);
  });

  it('rejects a malformed id with 422', async () => {
    await request(server.app)
      .put(api(`${section.path}/not-an-id`))
      .set('Authorization', bearer(candidate))
      .send(section.valid)
      .expect(422);
  });

  it('answers 404 for an id that does not exist', async () => {
    const response = await request(server.app)
      .delete(api(`${section.path}/507f1f77bcf86cd799439011`))
      .set('Authorization', bearer(candidate))
      .expect(404);

    expect(response.body.error.code).toBe(ERROR_CODES.RESOURCE_NOT_FOUND);
  });

  it('hides another candidate’s record behind a 404, never a 403', async () => {
    const created = await create(candidate);
    const intruder = await registerCandidate(server.app, {
      email: 'intruder@example.com',
      firstName: 'Mal',
      lastName: 'Lory',
    });

    await request(server.app)
      .put(api(`${section.path}/${created.id as string}`))
      .set('Authorization', bearer(intruder))
      .send(section.update)
      .expect(404);

    await request(server.app)
      .delete(api(`${section.path}/${created.id as string}`))
      .set('Authorization', bearer(intruder))
      .expect(404);

    const list = await request(server.app)
      .get(api(section.path))
      .set('Authorization', bearer(intruder))
      .expect(200);
    expect(list.body.data[section.plural]).toEqual([]);
  });

  it('refuses an HR account with 403', async () => {
    const hr = await registerHr(server.app);

    const response = await request(server.app)
      .get(api(section.path))
      .set('Authorization', bearer(hr))
      .expect(403);

    expect(response.body.error.code).toBe(ERROR_CODES.ROLE_FORBIDDEN);
  });

  it('requires authentication', async () => {
    await request(server.app).get(api(section.path)).expect(401);
  });
});

describe('section counts feed profile completion', () => {
  it('raises the percentage as each section is filled in', async () => {
    const before = await request(server.app)
      .get(api('/profile'))
      .set('Authorization', bearer(candidate))
      .expect(200);

    await request(server.app)
      .post(api('/experience'))
      .set('Authorization', bearer(candidate))
      .send(SECTIONS[0].valid)
      .expect(201);

    const after = await request(server.app)
      .get(api('/profile'))
      .set('Authorization', bearer(candidate))
      .expect(200);

    expect(after.body.data.completion.percentage).toBeGreaterThan(
      before.body.data.completion.percentage as number,
    );
    expect(
      (after.body.data.completion.missing as { key: string }[]).some(
        (item) => item.key === 'experience',
      ),
    ).toBe(false);
  });
});
