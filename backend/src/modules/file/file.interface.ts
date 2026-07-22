import type { FileKind } from '../../config/constants';
import { createToken, type Token } from '../../container/token';
import type { IFileStorage } from './file.storage';

export interface StoredFileRecord {
  readonly id: string;
  readonly ownerUserId: string;
  readonly kind: FileKind;
  readonly storageKey: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly createdAt: Date;
}

export interface CreateFileRecordData {
  readonly ownerUserId: string;
  readonly kind: FileKind;
  readonly storageKey: string;
  readonly originalName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

export interface IFileRepository {
  create(data: CreateFileRecordData): Promise<StoredFileRecord>;
  findByIdForOwner(id: string, ownerUserId: string): Promise<StoredFileRecord | null>;
}

export interface UploadFileInput {
  readonly kind: FileKind;
  readonly buffer: Buffer;
  readonly originalName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
}

export interface DownloadedFile {
  readonly record: StoredFileRecord;
  readonly content: Buffer;
}

export interface IFileService {
  upload(ownerUserId: string, input: UploadFileInput): Promise<StoredFileRecord>;
  download(id: string, requesterUserId: string): Promise<DownloadedFile>;
}

export const FILE_REPOSITORY: Token<IFileRepository> = createToken('IFileRepository');
export const FILE_SERVICE: Token<IFileService> = createToken('IFileService');
export const FILE_STORAGE: Token<IFileStorage> = createToken('IFileStorage');
