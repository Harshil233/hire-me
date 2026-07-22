import type { AxiosInstance } from 'axios';
import { z, type ZodType } from 'zod';

import { httpClient, request } from '@/services/api-client';
import { ApiError, UNEXPECTED_RESPONSE_CODE } from '@/services/api-error';

export interface ISectionApi<TItem> {
  list(): Promise<TItem[]>;
  create(payload: Record<string, unknown>): Promise<TItem>;
  update(id: string, payload: Record<string, unknown>): Promise<TItem>;
  remove(id: string): Promise<void>;
}

export interface SectionApiConfig<TItem> {
  readonly resourcePath: string;
  readonly pluralKey: string;
  readonly singularKey: string;
  readonly itemSchema: ZodType<TItem>;
}

/**
 * One API client for every user-owned section. The envelope key differs per resource
 * (`experiences`, `educations`, …), so it is read from the config rather than hard-coded.
 */
export const createSectionApi = <TItem>(
  config: SectionApiConfig<TItem>,
  client: AxiosInstance = httpClient,
): ISectionApi<TItem> => {
  const listSchema = z.record(z.string(), z.array(config.itemSchema));
  const singleSchema = z.record(z.string(), config.itemSchema);

  const readSingle = (data: Record<string, TItem>): TItem => {
    const item = data[config.singularKey];

    if (item === undefined) {
      throw new ApiError(
        200,
        UNEXPECTED_RESPONSE_CODE,
        'The server sent a response this app does not understand.',
      );
    }

    return item;
  };

  return {
    list: async () => {
      const data = await request(client, { url: config.resourcePath, method: 'GET' }, listSchema);
      return data[config.pluralKey] ?? [];
    },

    create: async (payload) =>
      readSingle(
        await request(
          client,
          { url: config.resourcePath, method: 'POST', data: payload },
          singleSchema,
        ),
      ),

    update: async (id, payload) =>
      readSingle(
        await request(
          client,
          { url: `${config.resourcePath}/${id}`, method: 'PUT', data: payload },
          singleSchema,
        ),
      ),

    remove: async (id) => {
      await client.request({ url: `${config.resourcePath}/${id}`, method: 'DELETE' });
    },
  };
};
