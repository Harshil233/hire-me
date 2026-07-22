import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ApiError } from '@/services/api-error';
import { createAuthApi, toCandidateRegisterPayload, toHrRegisterPayload } from '../api/auth.api';
import type { HrRegisterFormValues } from '../schemas/auth.schema';

const HR_VALUES: HrRegisterFormValues = {
  email: 'grace@acme.test',
  password: 'Str0ng!pass',
  confirmPassword: 'Str0ng!pass',
  firstName: 'Grace',
  middleName: '',
  lastName: 'Hopper',
  designation: 'Talent Lead',
  companyName: 'Acme Corp',
  companyDomain: 'ACME.com',
  companyHeadquarters: '',
  companyWebsiteUrl: 'https://acme.test',
  companyLinkedinUrl: '',
};

describe('toCandidateRegisterPayload', () => {
  it('omits a blank middle name', () => {
    const payload = toCandidateRegisterPayload({
      email: 'ada@example.com',
      password: 'Str0ng!pass',
      confirmPassword: 'Str0ng!pass',
      firstName: 'Ada',
      middleName: '  ',
      lastName: 'Lovelace',
    });

    expect(payload.middleName).toBeUndefined();
    expect(payload.confirmPassword).toBeUndefined();
  });
});

describe('toHrRegisterPayload', () => {
  it('nests the company fields and lowercases the domain', () => {
    const payload = toHrRegisterPayload(HR_VALUES);

    expect(payload.company).toEqual({
      name: 'Acme Corp',
      domain: 'acme.com',
      headquarters: undefined,
      websiteUrl: 'https://acme.test',
      linkedinUrl: undefined,
    });
    expect(payload.designation).toBe('Talent Lead');
  });

  it('never forwards the confirmation field', () => {
    expect(toHrRegisterPayload(HR_VALUES).confirmPassword).toBeUndefined();
  });
});

describe('createAuthApi', () => {
  const client = axios.create({ baseURL: 'http://api.test/api/v1' });
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(client);
  });

  afterEach(() => {
    mock.restore();
  });

  const session = {
    success: true,
    data: {
      user: { id: 'user-1', email: 'ada@example.com', role: 'candidate' },
      accessToken: 'token-1',
    },
  };

  it('signs a candidate in through the candidate path', async () => {
    mock.onPost('/candidate/login').reply(200, session);

    const result = await createAuthApi(client).login('candidate', {
      email: 'ada@example.com',
      password: 'Str0ng!pass',
    });

    expect(result.accessToken).toBe('token-1');
    expect(result.user.role).toBe('candidate');
    expect(mock.history.post[0]?.url).toBe('/candidate/login');
  });

  it('signs an HR in through the HR path', async () => {
    mock.onPost('/hr/login').reply(200, {
      ...session,
      data: { ...session.data, user: { ...session.data.user, role: 'hr' } },
    });

    const result = await createAuthApi(client).login('hr', {
      email: 'grace@acme.test',
      password: 'Str0ng!pass',
    });

    expect(result.user.role).toBe('hr');
    expect(mock.history.post[0]?.url).toBe('/hr/login');
  });

  it('registers a candidate', async () => {
    mock.onPost('/candidate/register').reply(201, session);

    await expect(
      createAuthApi(client).registerCandidate({
        email: 'ada@example.com',
        password: 'Str0ng!pass',
        confirmPassword: 'Str0ng!pass',
        firstName: 'Ada',
        middleName: '',
        lastName: 'Lovelace',
      }),
    ).resolves.toMatchObject({ accessToken: 'token-1' });
  });

  it('registers an HR account with its company', async () => {
    mock.onPost('/hr/register').reply(201, session);

    await createAuthApi(client).registerHr(HR_VALUES);

    expect(JSON.parse(mock.history.post[0]?.data as string)).toMatchObject({
      company: { name: 'Acme Corp' },
    });
  });

  it('refreshes and reads the current account', async () => {
    mock.onPost('/refresh').reply(200, session);
    mock.onGet('/me').reply(200, { success: true, data: { user: session.data.user } });

    await expect(createAuthApi(client).refresh()).resolves.toMatchObject({
      accessToken: 'token-1',
    });
    await expect(createAuthApi(client).me()).resolves.toMatchObject({ id: 'user-1' });
  });

  it('signs out', async () => {
    mock.onPost('/logout').reply(200, { success: true, data: { loggedOut: true } });

    await expect(createAuthApi(client).logout()).resolves.toBeUndefined();
  });

  it('rejects a response that does not match the contract', async () => {
    mock.onPost('/candidate/login').reply(200, { success: true, data: { user: { id: 1 } } });

    await expect(
      createAuthApi(client).login('candidate', { email: 'ada@example.com', password: 'x' }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
