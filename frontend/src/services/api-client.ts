import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { z, type ZodType } from 'zod';

import { env } from '@/config/env';
import { authTokenStore } from '@/store/auth.store';
import { UNEXPECTED_RESPONSE_CODE, ApiError } from './api-error';
import { createHttpClient } from './http-client';

/** Every successful response is `{ success: true, data: … }` (CLAUDE.md §13). */
const successEnvelope = <TSchema extends ZodType>(
  dataSchema: TSchema,
): ZodType<{ success: true; data: z.output<TSchema> }> =>
  z.object({ success: z.literal(true), data: dataSchema }) as unknown as ZodType<{
    success: true;
    data: z.output<TSchema>;
  }>;

/**
 * Performs a request and parses the payload at the boundary. Everything downstream
 * works with the inferred type and never with `unknown` (CLAUDE.md §10).
 */
export const request = async <TSchema extends ZodType>(
  client: AxiosInstance,
  config: AxiosRequestConfig,
  dataSchema: TSchema,
): Promise<z.output<TSchema>> => {
  const response = await client.request<unknown>(config);
  const parsed = successEnvelope(dataSchema).safeParse(response.data);

  if (!parsed.success) {
    throw new ApiError(
      response.status,
      UNEXPECTED_RESPONSE_CODE,
      'The server sent a response this app does not understand.',
    );
  }

  return parsed.data.data;
};

/** Requests that return raw bytes (images, resumes) rather than the JSON envelope. */
export const requestBlob = async (client: AxiosInstance, url: string): Promise<Blob> => {
  const response = await client.request<Blob>({ url, method: 'GET', responseType: 'blob' });
  return response.data;
};

export const httpClient = createHttpClient({
  baseURL: env.VITE_API_BASE_URL,
  getAccessToken: authTokenStore.get,
  onAccessTokenRefreshed: authTokenStore.set,
  onSessionExpired: authTokenStore.clear,
});
