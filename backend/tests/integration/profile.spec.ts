import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { CANDIDATE_COMPLETION_WEIGHTS, ROLES } from '../../src/config/constants';
import { ERROR_CODES } from '../../src/common/errors/error-codes';
import { api, bearer, registerCandidate, registerHr } from '../helpers/api-client';
import { startTestServer, type TestServer } from '../helpers/test-server';

let server: TestServer;

beforeAll(async () => {
  server = await startTestServer();
});

afterAll(async () => {
  await server.stop();
});

beforeEach(async () => {
  await server.reset();
});

describe('GET /profile — candidate', () => {
  it('returns the profile with a completion breakdown', async () => {
    const user = await registerCandidate(server.app);

    const response = await request(server.app)
      .get(api('/profile'))
      .set('Authorization', bearer(user))
      .expect(200);

    expect(response.body.data.role).toBe(ROLES.CANDIDATE);
    expect(response.body.data.profile).toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
      skills: [],
      preferredLocations: [],
      currency: 'INR',
    });
    expect(response.body.data.completion.percentage).toBe(CANDIDATE_COMPLETION_WEIGHTS.name);
    expect(response.body.data.completion.missing.length).toBeGreaterThan(0);
  });

  it('requires authentication', async () => {
    await request(server.app).get(api('/profile')).expect(401);
  });
});

describe('PUT /profile — candidate', () => {
  it('saves personal details and raises the completion percentage', async () => {
    const user = await registerCandidate(server.app);

    const response = await request(server.app)
      .put(api('/profile'))
      .set('Authorization', bearer(user))
      .send({
        mobile: { countryCode: '+91', number: '9876543210' },
        gender: 'female',
        dob: '1990-05-04',
        currentLocation: 'Pune',
      })
      .expect(200);

    expect(response.body.data.profile).toMatchObject({
      mobile: { countryCode: '+91', number: '9876543210' },
      gender: 'female',
      dob: '1990-05-04T00:00:00.000Z',
      currentLocation: 'Pune',
    });
    expect(response.body.data.completion.percentage).toBeGreaterThan(
      CANDIDATE_COMPLETION_WEIGHTS.name,
    );
  });

  it('normalises skills — trims, de-duplicates and keeps order', async () => {
    const user = await registerCandidate(server.app);

    const response = await request(server.app)
      .put(api('/profile'))
      .set('Authorization', bearer(user))
      .send({ skills: [' TypeScript ', 'typescript', 'Node.js'] })
      .expect(200);

    expect(response.body.data.profile.skills).toEqual(['TypeScript', 'Node.js']);
  });

  it('leaves untouched fields alone across successive saves', async () => {
    const user = await registerCandidate(server.app);

    await request(server.app)
      .put(api('/profile'))
      .set('Authorization', bearer(user))
      .send({ currentLocation: 'Pune' })
      .expect(200);

    const response = await request(server.app)
      .put(api('/profile'))
      .set('Authorization', bearer(user))
      .send({ skills: ['Go'] })
      .expect(200);

    expect(response.body.data.profile.currentLocation).toBe('Pune');
    expect(response.body.data.profile.skills).toEqual(['Go']);
  });

  it('clears a field when null is sent explicitly', async () => {
    const user = await registerCandidate(server.app);

    await request(server.app)
      .put(api('/profile'))
      .set('Authorization', bearer(user))
      .send({ currentLocation: 'Pune', expectedCtc: 1_500_000 })
      .expect(200);

    const response = await request(server.app)
      .put(api('/profile'))
      .set('Authorization', bearer(user))
      .send({ currentLocation: null, expectedCtc: null })
      .expect(200);

    expect(response.body.data.profile.currentLocation).toBeUndefined();
    expect(response.body.data.profile.expectedCtc).toBeUndefined();
  });

  it.each([
    ['a malformed mobile number', { mobile: { countryCode: '91', number: 'abc' } }],
    ['an unknown gender', { gender: 'wizard' }],
    ['a date of birth in the future', { dob: '2999-01-01' }],
    ['a negative salary', { expectedCtc: -1 }],
    ['an unknown job type', { jobTypes: ['astronaut'] }],
    ['an empty payload', {}],
  ])('rejects %s with 422', async (_case, payload) => {
    const user = await registerCandidate(server.app);

    const response = await request(server.app)
      .put(api('/profile'))
      .set('Authorization', bearer(user))
      .send(payload)
      .expect(422);

    expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
  });

  it('rejects an HR-shaped payload from a candidate', async () => {
    const user = await registerCandidate(server.app);

    await request(server.app)
      .put(api('/profile'))
      .set('Authorization', bearer(user))
      .send({ designation: 'Talent Lead' })
      .expect(422);
  });
});

describe('GET /profile — HR', () => {
  it('embeds the company created at registration', async () => {
    const user = await registerHr(server.app);

    const response = await request(server.app)
      .get(api('/profile'))
      .set('Authorization', bearer(user))
      .expect(200);

    expect(response.body.data.role).toBe(ROLES.HR);
    expect(response.body.data.profile.company).toMatchObject({
      name: 'Acme Corp',
      slug: 'acme-corp',
    });
    expect(response.body.data.profile.companyRole).toBe('owner');
  });

  it('accepts the HR update shape and rejects the candidate one', async () => {
    const user = await registerHr(server.app);

    const response = await request(server.app)
      .put(api('/profile'))
      .set('Authorization', bearer(user))
      .send({ designation: 'Head of Talent' })
      .expect(200);

    expect(response.body.data.profile.designation).toBe('Head of Talent');

    await request(server.app)
      .put(api('/profile'))
      .set('Authorization', bearer(user))
      .send({ skills: ['recruiting'] })
      .expect(422);
  });

  it('scores company completeness into the percentage', async () => {
    const user = await registerHr(server.app);

    const before = await request(server.app)
      .get(api('/profile'))
      .set('Authorization', bearer(user))
      .expect(200);

    const after = await request(server.app)
      .put(api('/profile'))
      .set('Authorization', bearer(user))
      .send({ designation: 'Head of Talent' })
      .expect(200);

    expect(after.body.data.completion.percentage).toBeGreaterThan(
      before.body.data.completion.percentage as number,
    );
  });
});

describe('profile isolation', () => {
  it('never returns another user’s profile', async () => {
    const ada = await registerCandidate(server.app);
    const grace = await registerCandidate(server.app, {
      email: 'grace@example.com',
      firstName: 'Grace',
      lastName: 'Hopper',
    });

    const adaResponse = await request(server.app)
      .get(api('/profile'))
      .set('Authorization', bearer(ada))
      .expect(200);
    const graceResponse = await request(server.app)
      .get(api('/profile'))
      .set('Authorization', bearer(grace))
      .expect(200);

    expect(adaResponse.body.data.profile.firstName).toBe('Ada');
    expect(graceResponse.body.data.profile.firstName).toBe('Grace');
  });
});
