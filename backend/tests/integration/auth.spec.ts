import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { REFRESH_COOKIE_NAME, ROLES } from '../../src/config/constants';
import { ERROR_CODES } from '../../src/common/errors/error-codes';
import { UserModel } from '../../src/database/models/user.model';
import { CandidateProfileModel } from '../../src/database/models/candidate-profile.model';
import { CompanyModel } from '../../src/database/models/company.model';
import { HrProfileModel } from '../../src/database/models/hr-profile.model';
import {
  CANDIDATE_CREDENTIALS,
  HR_CREDENTIALS,
  api,
  extractRefreshCookie,
  registerCandidate,
  registerHr,
} from '../helpers/api-client';
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

describe('POST /candidate/register', () => {
  it('creates the account and an empty profile, returning a session', async () => {
    const response = await request(server.app)
      .post(api('/candidate/register'))
      .send(CANDIDATE_CREDENTIALS)
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        user: { email: 'ada@example.com', role: ROLES.CANDIDATE },
        accessToken: expect.any(String) as string,
      },
    });

    const profile = await CandidateProfileModel.findOne({}).lean();
    expect(profile?.firstName).toBe('Ada');
    expect(profile?.skills).toEqual([]);
  });

  it('sets an httpOnly refresh cookie and keeps the token out of the body', async () => {
    const response = await request(server.app)
      .post(api('/candidate/register'))
      .send(CANDIDATE_CREDENTIALS)
      .expect(201);

    const cookie = extractRefreshCookie(response.headers as Record<string, unknown>);
    expect(cookie).toContain('HttpOnly');
    expect(response.body.data.refreshToken).toBeUndefined();
  });

  it('never stores the password in plain text', async () => {
    await registerCandidate(server.app);

    const user = await UserModel.findOne({ email: 'ada@example.com' }).lean();
    expect(user?.passwordHash).not.toBe(CANDIDATE_CREDENTIALS.password);
    expect(user?.passwordHash.startsWith('$2')).toBe(true);
  });

  it('lowercases the email', async () => {
    await registerCandidate(server.app, { email: '  ADA@Example.COM ' });

    expect(await UserModel.countDocuments({ email: 'ada@example.com' })).toBe(1);
  });

  it('rejects a duplicate email with 409', async () => {
    await registerCandidate(server.app);

    const response = await request(server.app)
      .post(api('/candidate/register'))
      .send(CANDIDATE_CREDENTIALS)
      .expect(409);

    expect(response.body.error.code).toBe(ERROR_CODES.EMAIL_ALREADY_EXISTS);
    expect(await UserModel.countDocuments({})).toBe(1);
  });

  it('rejects a weak password with 422 and per-field details', async () => {
    const response = await request(server.app)
      .post(api('/candidate/register'))
      .send({ ...CANDIDATE_CREDENTIALS, password: 'weak' })
      .expect(422);

    expect(response.body.error.code).toBe(ERROR_CODES.VALIDATION_ERROR);
    expect(response.body.error.details.some((d: { field: string }) => d.field === 'password')).toBe(
      true,
    );
    expect(await UserModel.countDocuments({})).toBe(0);
  });

  it('rejects a malformed email and a missing name together', async () => {
    const response = await request(server.app)
      .post(api('/candidate/register'))
      .send({ email: 'nope', password: 'Str0ng!pass' })
      .expect(422);

    const fields = response.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'firstName', 'lastName']));
  });
});

describe('POST /hr/register', () => {
  it('creates user, HR profile and company together', async () => {
    const response = await request(server.app)
      .post(api('/hr/register'))
      .send({ ...HR_CREDENTIALS, company: { name: 'Acme Corp', domain: 'acme.test' } })
      .expect(201);

    expect(response.body.data.user.role).toBe(ROLES.HR);

    const company = await CompanyModel.findOne({}).lean();
    const hrProfile = await HrProfileModel.findOne({}).lean();

    expect(company?.slug).toBe('acme-corp');
    expect(hrProfile?.companyId?.toHexString()).toBe(company?._id.toHexString());
    expect(hrProfile?.companyRole).toBe('owner');
  });

  it('rolls the whole registration back when the company cannot be created', async () => {
    await registerHr(server.app, { company: { name: 'Acme Corp', domain: 'acme.test' } });

    const response = await request(server.app)
      .post(api('/hr/register'))
      .send({
        ...HR_CREDENTIALS,
        email: 'second@acme.test',
        company: { name: 'Another Corp', domain: 'acme.test' },
      })
      .expect(409);

    expect(response.body.error.code).toBe(ERROR_CODES.COMPANY_ALREADY_EXISTS);
    // The orphan check: no half-created account may survive the failed transaction.
    expect(await UserModel.countDocuments({ email: 'second@acme.test' })).toBe(0);
    expect(await HrProfileModel.countDocuments({})).toBe(1);
    expect(await CompanyModel.countDocuments({})).toBe(1);
  });

  it('gives the second company with the same name a distinct slug', async () => {
    await registerHr(server.app);
    await registerHr(server.app, { email: 'other@acme.test' });

    const slugs = (await CompanyModel.find({}).lean()).map((company) => company.slug).sort();
    expect(slugs).toEqual(['acme-corp', 'acme-corp-2']);
  });

  it('rejects an invalid company payload before creating anything', async () => {
    await request(server.app)
      .post(api('/hr/register'))
      .send({ ...HR_CREDENTIALS, company: { name: 'Acme', websiteUrl: 'not-a-url' } })
      .expect(422);

    expect(await UserModel.countDocuments({})).toBe(0);
  });
});

describe('POST /candidate/login and /hr/login', () => {
  const candidateCredentials = {
    email: CANDIDATE_CREDENTIALS.email,
    password: CANDIDATE_CREDENTIALS.password,
  };
  const hrCredentials = { email: HR_CREDENTIALS.email, password: HR_CREDENTIALS.password };

  it('returns a session for valid candidate credentials', async () => {
    await registerCandidate(server.app);

    const response = await request(server.app)
      .post(api('/candidate/login'))
      .send(candidateCredentials)
      .expect(200);

    expect(response.body.data.user.role).toBe(ROLES.CANDIDATE);
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(await UserModel.findOne({}).lean()).toMatchObject({ lastLoginAt: expect.any(Date) });
  });

  it('returns a session for valid HR credentials', async () => {
    await registerHr(server.app);

    const response = await request(server.app)
      .post(api('/hr/login'))
      .send(hrCredentials)
      .expect(200);

    expect(response.body.data.user.role).toBe(ROLES.HR);
  });

  it('accepts a differently-cased email', async () => {
    await registerCandidate(server.app);

    await request(server.app)
      .post(api('/candidate/login'))
      .send({ email: 'ADA@EXAMPLE.COM', password: CANDIDATE_CREDENTIALS.password })
      .expect(200);
  });

  it('refuses a candidate on the HR path, with no session and no sign-in recorded', async () => {
    await registerCandidate(server.app);

    const response = await request(server.app)
      .post(api('/hr/login'))
      .send(candidateCredentials)
      .expect(401);

    expect(response.body.error.code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
    expect(response.headers['set-cookie']).toBeUndefined();
    expect((await UserModel.findOne({}).lean())?.lastLoginAt).toBeUndefined();
  });

  it('refuses an HR on the candidate path', async () => {
    await registerHr(server.app);

    const response = await request(server.app)
      .post(api('/candidate/login'))
      .send(hrCredentials)
      .expect(401);

    expect(response.body.error.code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('answers the wrong path exactly as it answers a wrong password, leaking no role', async () => {
    await registerCandidate(server.app);

    const wrongPath = await request(server.app)
      .post(api('/hr/login'))
      .send(candidateCredentials)
      .expect(401);

    const wrongPassword = await request(server.app)
      .post(api('/candidate/login'))
      .send({ ...candidateCredentials, password: 'Wr0ng!pass' })
      .expect(401);

    expect(wrongPath.body).toEqual(wrongPassword.body);
  });

  it.each([
    ['a wrong password', { email: CANDIDATE_CREDENTIALS.email, password: 'Wr0ng!pass' }],
    ['an unknown email', { email: 'nobody@example.com', password: 'Str0ng!pass' }],
  ])('answers %s with the same generic 401', async (_case, credentials) => {
    await registerCandidate(server.app);

    const response = await request(server.app)
      .post(api('/candidate/login'))
      .send(credentials)
      .expect(401);

    expect(response.body.error.code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
    expect(response.body.error.message).toBe('Email or password is incorrect');
  });

  it('rejects an empty password with 422 rather than 401', async () => {
    await request(server.app)
      .post(api('/candidate/login'))
      .send({ email: CANDIDATE_CREDENTIALS.email, password: '' })
      .expect(422);
  });

  it('no longer exposes an unscoped /login route', async () => {
    await registerCandidate(server.app);

    const response = await request(server.app)
      .post(api('/login'))
      .send(candidateCredentials)
      .expect(404);

    expect(response.body.error.code).toBe(ERROR_CODES.ROUTE_NOT_FOUND);
  });
});

describe('POST /refresh and /logout', () => {
  it('rotates the refresh cookie and issues a new access token', async () => {
    const user = await registerCandidate(server.app);

    const response = await request(server.app)
      .post(api('/refresh'))
      .set('Cookie', user.refreshCookie)
      .expect(200);

    const rotated = extractRefreshCookie(response.headers as Record<string, unknown>);
    expect(response.body.data.accessToken).toEqual(expect.any(String));
    expect(rotated).not.toBe(user.refreshCookie);
  });

  it('rejects replay of a rotated cookie and kills the family', async () => {
    const user = await registerCandidate(server.app);

    const rotatedResponse = await request(server.app)
      .post(api('/refresh'))
      .set('Cookie', user.refreshCookie)
      .expect(200);
    const rotated = extractRefreshCookie(rotatedResponse.headers as Record<string, unknown>);

    // Replaying the original cookie must fail…
    const replay = await request(server.app)
      .post(api('/refresh'))
      .set('Cookie', user.refreshCookie)
      .expect(401);
    expect(replay.body.error.code).toBe(ERROR_CODES.REFRESH_TOKEN_INVALID);

    // …and must also invalidate the token that replaced it.
    await request(server.app).post(api('/refresh')).set('Cookie', rotated).expect(401);
  });

  it('rejects a request with no refresh cookie', async () => {
    await request(server.app).post(api('/refresh')).expect(401);
  });

  it('rejects a forged cookie', async () => {
    await request(server.app)
      .post(api('/refresh'))
      .set('Cookie', `${REFRESH_COOKIE_NAME}=not-a-real-token`)
      .expect(401);
  });

  it('logs out, clears the cookie and invalidates the session', async () => {
    const user = await registerCandidate(server.app);

    const response = await request(server.app)
      .post(api('/logout'))
      .set('Cookie', user.refreshCookie)
      .expect(200);

    expect(response.body.data.loggedOut).toBe(true);
    await request(server.app).post(api('/refresh')).set('Cookie', user.refreshCookie).expect(401);
  });

  it('logs out cleanly even without a cookie', async () => {
    await request(server.app).post(api('/logout')).expect(200);
  });
});

describe('GET /me', () => {
  it('returns the authenticated account', async () => {
    const user = await registerCandidate(server.app);

    const response = await request(server.app)
      .get(api('/me'))
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(response.body.data.user).toEqual({
      id: user.userId,
      email: 'ada@example.com',
      role: ROLES.CANDIDATE,
    });
  });

  it.each([
    ['no header', undefined],
    ['a non-bearer scheme', 'Basic abc'],
    ['a forged token', 'Bearer forged.token.value'],
  ])('rejects %s with 401', async (_case, header) => {
    const call = request(server.app).get(api('/me'));
    if (header !== undefined) {
      call.set('Authorization', header);
    }

    await call.expect(401);
  });
});

describe('API basics', () => {
  it('reports health', async () => {
    const response = await request(server.app).get(api('/health')).expect(200);

    expect(response.body.data).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('answers an unknown route with the standard 404 envelope', async () => {
    const response = await request(server.app).get(api('/nope')).expect(404);

    expect(response.body).toEqual({
      success: false,
      error: {
        code: ERROR_CODES.ROUTE_NOT_FOUND,
        message: expect.stringContaining('/api/v1/nope') as string,
        details: [],
      },
    });
  });

  it('rejects malformed JSON with 422 rather than a stack trace', async () => {
    const response = await request(server.app)
      .post(api('/candidate/login'))
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(422);

    expect(response.body.error.message).toMatch(/not valid JSON/);
  });

  it('echoes a correlation id on every response', async () => {
    const response = await request(server.app)
      .get(api('/health'))
      .set('x-request-id', 'trace-123')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('trace-123');
  });
});
