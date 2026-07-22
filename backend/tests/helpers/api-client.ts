import type { Express } from 'express';
import request from 'supertest';

import { API_PREFIX, REFRESH_COOKIE_NAME } from '../../src/config/constants';

export const api = (path: string): string => `${API_PREFIX}${path}`;

export interface RegisteredUser {
  readonly userId: string;
  readonly email: string;
  readonly accessToken: string;
  readonly refreshCookie: string;
}

export const CANDIDATE_CREDENTIALS = {
  email: 'ada@example.com',
  password: 'Str0ng!pass',
  firstName: 'Ada',
  lastName: 'Lovelace',
};

export interface CompanyPayload {
  name: string;
  domain?: string;
  websiteUrl?: string;
}

export const HR_CREDENTIALS: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  company: CompanyPayload;
} = {
  email: 'grace@acme.test',
  password: 'Str0ng!pass',
  firstName: 'Grace',
  lastName: 'Hopper',
  company: { name: 'Acme Corp' },
};

const extractRefreshCookie = (headers: Record<string, unknown>): string => {
  const raw = headers['set-cookie'];
  const cookies = Array.isArray(raw) ? (raw as string[]) : [];
  return cookies.find((cookie) => cookie.startsWith(REFRESH_COOKIE_NAME)) ?? '';
};

/** Registers a candidate and returns everything needed to call authenticated routes. */
export const registerCandidate = async (
  app: Express,
  overrides: Partial<typeof CANDIDATE_CREDENTIALS> = {},
): Promise<RegisteredUser> => {
  const payload = { ...CANDIDATE_CREDENTIALS, ...overrides };
  const response = await request(app).post(api('/candidate/register')).send(payload).expect(201);

  return {
    userId: response.body.data.user.id as string,
    email: response.body.data.user.email as string,
    accessToken: response.body.data.accessToken as string,
    refreshCookie: extractRefreshCookie(response.headers as Record<string, unknown>),
  };
};

export const registerHr = async (
  app: Express,
  overrides: Partial<typeof HR_CREDENTIALS> = {},
): Promise<RegisteredUser> => {
  const payload = { ...HR_CREDENTIALS, ...overrides };
  const response = await request(app).post(api('/hr/register')).send(payload).expect(201);

  return {
    userId: response.body.data.user.id as string,
    email: response.body.data.user.email as string,
    accessToken: response.body.data.accessToken as string,
    refreshCookie: extractRefreshCookie(response.headers as Record<string, unknown>),
  };
};

export const bearer = (user: RegisteredUser): string => `Bearer ${user.accessToken}`;

export { extractRefreshCookie };
