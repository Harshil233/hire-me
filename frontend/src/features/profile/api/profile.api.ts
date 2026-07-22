import type { AxiosInstance } from 'axios';

import type { FileKind } from '@/config/constants';
import { httpClient, request, requestBlob } from '@/services/api-client';
import {
  companyResponseSchema,
  profileViewSchema,
  uploadedFileSchema,
  type Company,
  type ProfileView,
} from '../schemas/profile.schema';

export interface UploadedFile {
  readonly id: string;
  readonly originalName: string;
}

export interface IProfileApi {
  getProfile(): Promise<ProfileView>;
  updateProfile(payload: Record<string, unknown>): Promise<ProfileView>;
  updateCompany(companyId: string, payload: Record<string, unknown>): Promise<Company>;
  uploadFile(kind: FileKind, file: File): Promise<UploadedFile>;
  downloadFile(fileId: string): Promise<Blob>;
}

export const createProfileApi = (client: AxiosInstance = httpClient): IProfileApi => ({
  getProfile: () => request(client, { url: '/profile', method: 'GET' }, profileViewSchema),

  updateProfile: (payload) =>
    request(client, { url: '/profile', method: 'PUT', data: payload }, profileViewSchema),

  updateCompany: async (companyId, payload) =>
    (
      await request(
        client,
        { url: `/company/${companyId}`, method: 'PUT', data: payload },
        companyResponseSchema,
      )
    ).company,

  uploadFile: async (kind, file) => {
    const formData = new FormData();
    formData.append('kind', kind);
    formData.append('file', file);

    const response = await request(
      client,
      { url: '/files', method: 'POST', data: formData },
      uploadedFileSchema,
    );

    return { id: response.file.id, originalName: response.file.originalName };
  },

  downloadFile: (fileId) => requestBlob(client, `/files/${fileId}`),
});

export const profileApi: IProfileApi = createProfileApi();
