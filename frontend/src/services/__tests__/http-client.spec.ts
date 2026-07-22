import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../api-error';
import { createHttpClient } from '../http-client';

/**
 * The refresh-and-retry flow is the piece most likely to break silently, so it is
 * exercised against a mocked transport rather than mocked internals.
 */

const BASE_URL = 'http://api.test/api/v1';

let mock: MockAdapter;
let refreshMock: MockAdapter;
let accessToken: string | null;
let onRefreshed: ReturnType<typeof vi.fn>;
let onExpired: ReturnType<typeof vi.fn>;

const buildClient = (): ReturnType<typeof createHttpClient> =>
  createHttpClient({
    baseURL: BASE_URL,
    getAccessToken: () => accessToken,
    onAccessTokenRefreshed: (token) => {
      accessToken = token;
      onRefreshed(token);
    },
    onSessionExpired: onExpired,
  });

beforeEach(() => {
  accessToken = 'initial-token';
  onRefreshed = vi.fn();
  onExpired = vi.fn();
  // The refresh call goes out on the bare axios instance, so both are mocked.
  refreshMock = new MockAdapter(axios);
});

afterEach(() => {
  mock.restore();
  refreshMock.restore();
});

describe('createHttpClient', () => {
  it('attaches the bearer token to every request', async () => {
    const client = buildClient();
    mock = new MockAdapter(client);
    mock.onGet('/profile').reply(200, { success: true, data: {} });

    await client.get('/profile');

    expect(mock.history.get[0]?.headers?.Authorization).toBe('Bearer initial-token');
  });

  it('omits the header when signed out', async () => {
    accessToken = null;
    const client = buildClient();
    mock = new MockAdapter(client);
    mock.onGet('/profile').reply(200, { success: true, data: {} });

    await client.get('/profile');

    expect(mock.history.get[0]?.headers?.Authorization).toBeUndefined();
  });

  it('sends credentials so the refresh cookie travels with the request', () => {
    const client = buildClient();
    mock = new MockAdapter(client);

    expect(client.defaults.withCredentials).toBe(true);
  });

  it('refreshes and retries once after a 401', async () => {
    const client = buildClient();
    mock = new MockAdapter(client);
    refreshMock
      .onPost(`${BASE_URL}/refresh`)
      .reply(200, { success: true, data: { accessToken: 'fresh-token' } });

    mock
      .onGet('/profile')
      .replyOnce(401, { success: false, error: { code: 'TOKEN_EXPIRED', message: 'expired' } })
      .onGet('/profile')
      .reply(200, { success: true, data: { ok: true } });

    const response = await client.get<{ data: { ok: boolean } }>('/profile');

    expect(response.data.data.ok).toBe(true);
    expect(onRefreshed).toHaveBeenCalledWith('fresh-token');
    expect(mock.history.get[1]?.headers?.Authorization).toBe('Bearer fresh-token');
  });

  it('signs the user out when the refresh itself fails', async () => {
    const client = buildClient();
    mock = new MockAdapter(client);
    refreshMock.onPost(`${BASE_URL}/refresh`).reply(401, {
      success: false,
      error: { code: 'REFRESH_TOKEN_INVALID', message: 'expired' },
    });
    mock.onGet('/profile').reply(401, {
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'expired' },
    });

    await expect(client.get('/profile')).rejects.toBeInstanceOf(ApiError);
    expect(onExpired).toHaveBeenCalledOnce();
  });

  it('does not retry more than once', async () => {
    const client = buildClient();
    mock = new MockAdapter(client);
    refreshMock
      .onPost(`${BASE_URL}/refresh`)
      .reply(200, { success: true, data: { accessToken: 'fresh-token' } });
    mock.onGet('/profile').reply(401, {
      success: false,
      error: { code: 'TOKEN_EXPIRED', message: 'expired' },
    });

    await expect(client.get('/profile')).rejects.toBeInstanceOf(ApiError);
    expect(mock.history.get).toHaveLength(2);
  });

  it('shares one refresh across concurrent 401s', async () => {
    const client = buildClient();
    mock = new MockAdapter(client);
    refreshMock
      .onPost(`${BASE_URL}/refresh`)
      .reply(200, { success: true, data: { accessToken: 'fresh-token' } });

    mock
      .onGet('/profile')
      .replyOnce(401, { success: false, error: { code: 'TOKEN_EXPIRED', message: 'x' } })
      .onGet('/experience')
      .replyOnce(401, { success: false, error: { code: 'TOKEN_EXPIRED', message: 'x' } })
      .onAny()
      .reply(200, { success: true, data: {} });

    await Promise.all([client.get('/profile'), client.get('/experience')]);

    expect(refreshMock.history.post).toHaveLength(1);
  });

  it.each(['/candidate/login', '/hr/login'])(
    'never tries to refresh a failed login on %s',
    async (path) => {
      const client = buildClient();
      mock = new MockAdapter(client);
      mock.onPost(path).reply(401, {
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' },
      });

      await expect(client.post(path, {})).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      });
      expect(refreshMock.history.post).toHaveLength(0);
      expect(onExpired).not.toHaveBeenCalled();
    },
  );

  it('converts a non-401 failure into an ApiError', async () => {
    const client = buildClient();
    mock = new MockAdapter(client);
    mock.onGet('/profile').reply(404, {
      success: false,
      error: { code: 'PROFILE_NOT_FOUND', message: 'Missing' },
    });

    await expect(client.get('/profile')).rejects.toMatchObject({
      status: 404,
      code: 'PROFILE_NOT_FOUND',
    });
  });

  it('converts a network failure into an ApiError', async () => {
    const client = buildClient();
    mock = new MockAdapter(client);
    mock.onGet('/profile').networkError();

    await expect(client.get('/profile')).rejects.toMatchObject({ status: 0 });
  });
});
