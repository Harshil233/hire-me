import type { AxiosInstance } from 'axios';

import { httpClient, requestBlob } from './api-client';

/**
 * Protected files, which more than one feature needs: a candidate reads their own
 * uploads back, and an employer opens a candidate's résumé. Declared once here so the
 * endpoint is not spelled out per feature (CLAUDE.md §9).
 */
export interface IFileApi {
  download(fileId: string): Promise<Blob>;
}

export const createFileApi = (client: AxiosInstance = httpClient): IFileApi => ({
  download: (fileId) => requestBlob(client, `/files/${fileId}`),
});

export const fileApi: IFileApi = createFileApi();
