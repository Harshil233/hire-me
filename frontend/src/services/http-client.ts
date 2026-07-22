import axios, { type AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { toApiError } from './api-error';

export interface HttpClientOptions {
  readonly baseURL: string;
  /** Current access token, or `null` when signed out. */
  readonly getAccessToken: () => string | null;
  readonly onAccessTokenRefreshed: (accessToken: string) => void;
  readonly onSessionExpired: () => void;
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  /** Guards against an endless 401 → refresh → 401 loop. */
  _isRetry?: boolean;
}

/** Endpoints that must never trigger the refresh-and-retry flow. */
const AUTH_ENDPOINTS = ['/login', '/refresh', '/logout'];

const isAuthEndpoint = (url: string | undefined): boolean =>
  url !== undefined && AUTH_ENDPOINTS.some((endpoint) => url.endsWith(endpoint));

/**
 * Axios instance that transparently refreshes an expired access token.
 * Concurrent 401s share a single refresh call (single-flight), so a page with several
 * queries in flight does not fire several refreshes and rotate the cookie repeatedly.
 */
export const createHttpClient = (options: HttpClientOptions): AxiosInstance => {
  const client = axios.create({
    baseURL: options.baseURL,
    withCredentials: true,
    headers: { Accept: 'application/json' },
  });

  client.interceptors.request.use((config) => {
    const token = options.getAccessToken();

    if (token !== null && (config.headers as unknown) !== undefined) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  let refreshInFlight: Promise<string> | null = null;

  const refreshAccessToken = async (): Promise<string> => {
    refreshInFlight ??= (async (): Promise<string> => {
      try {
        const response = await axios.post<{ data: { accessToken: string } }>(
          `${options.baseURL}/refresh`,
          undefined,
          { withCredentials: true },
        );
        const accessToken = response.data.data.accessToken;
        options.onAccessTokenRefreshed(accessToken);
        return accessToken;
      } finally {
        refreshInFlight = null;
      }
    })();

    return refreshInFlight;
  };

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as RetriableConfig | undefined;
      const status = error.response?.status;

      const canRetry =
        status === 401 &&
        config !== undefined &&
        config._isRetry !== true &&
        !isAuthEndpoint(config.url);

      if (canRetry) {
        try {
          const accessToken = await refreshAccessToken();
          config._isRetry = true;
          config.headers.Authorization = `Bearer ${accessToken}`;
          return await client.request(config);
        } catch {
          options.onSessionExpired();
          throw toApiError(401, error.response?.data);
        }
      }

      throw toApiError(status, error.response?.data);
    },
  );

  return client;
};
