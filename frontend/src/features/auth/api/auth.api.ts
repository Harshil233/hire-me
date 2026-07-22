import type { AxiosInstance } from 'axios';

import { httpClient, request } from '@/services/api-client';
import type { Role } from '@/config/constants';
import { orUndefined } from '@/lib/validation';
import {
  authSessionSchema,
  meResponseSchema,
  type AuthSessionResponse,
  type CandidateRegisterFormValues,
  type HrRegisterFormValues,
  type LoginFormValues,
  type SessionUserResponse,
} from '../schemas/auth.schema';

/**
 * Feature API layer. Components never call axios directly; hooks consume this and
 * tests inject a stub client (CLAUDE.md §10).
 */
export interface IAuthApi {
  /** Sign-in is role-scoped: each role has its own path and refuses the other's accounts. */
  login(role: Role, values: LoginFormValues): Promise<AuthSessionResponse>;
  registerCandidate(values: CandidateRegisterFormValues): Promise<AuthSessionResponse>;
  registerHr(values: HrRegisterFormValues): Promise<AuthSessionResponse>;
  refresh(): Promise<AuthSessionResponse>;
  logout(): Promise<void>;
  me(): Promise<SessionUserResponse>;
}

/** Maps flat form values onto the nested registration payload the API expects. */
export const toHrRegisterPayload = (values: HrRegisterFormValues): Record<string, unknown> => ({
  email: values.email,
  password: values.password,
  firstName: values.firstName,
  middleName: orUndefined(values.middleName),
  lastName: values.lastName,
  designation: orUndefined(values.designation),
  company: {
    name: values.companyName,
    domain: orUndefined(values.companyDomain)?.toLowerCase(),
    headquarters: orUndefined(values.companyHeadquarters),
    websiteUrl: orUndefined(values.companyWebsiteUrl),
    linkedinUrl: orUndefined(values.companyLinkedinUrl),
  },
});

export const toCandidateRegisterPayload = (
  values: CandidateRegisterFormValues,
): Record<string, unknown> => ({
  email: values.email,
  password: values.password,
  firstName: values.firstName,
  middleName: orUndefined(values.middleName),
  lastName: values.lastName,
});

export const createAuthApi = (client: AxiosInstance = httpClient): IAuthApi => ({
  login: (role, values) =>
    request(client, { url: `/${role}/login`, method: 'POST', data: values }, authSessionSchema),

  registerCandidate: (values) =>
    request(
      client,
      { url: '/candidate/register', method: 'POST', data: toCandidateRegisterPayload(values) },
      authSessionSchema,
    ),

  registerHr: (values) =>
    request(
      client,
      { url: '/hr/register', method: 'POST', data: toHrRegisterPayload(values) },
      authSessionSchema,
    ),

  refresh: () => request(client, { url: '/refresh', method: 'POST' }, authSessionSchema),

  logout: async () => {
    await client.request({ url: '/logout', method: 'POST' });
  },

  me: async () => (await request(client, { url: '/me', method: 'GET' }, meResponseSchema)).user,
});

export const authApi: IAuthApi = createAuthApi();
