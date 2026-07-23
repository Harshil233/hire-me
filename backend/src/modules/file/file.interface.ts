import type { FileKind, Role } from '../../config/constants';
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
  /** Unscoped read; who may see the record is decided by the access policies. */
  findById(id: string): Promise<StoredFileRecord | null>;
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

/** Who is asking for a file, which is all the access policies need to decide. */
export interface FileRequester {
  readonly userId: string;
  readonly role: Role;
}

export interface IFileService {
  upload(ownerUserId: string, input: UploadFileInput): Promise<StoredFileRecord>;
  download(id: string, requester: FileRequester): Promise<DownloadedFile>;
}

export const FILE_REPOSITORY: Token<IFileRepository> = createToken('IFileRepository');
export const FILE_SERVICE: Token<IFileService> = createToken('IFileService');
export const FILE_STORAGE: Token<IFileStorage> = createToken('IFileStorage');
