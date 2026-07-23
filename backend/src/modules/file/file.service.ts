import { ALLOWED_MIME_TYPES } from '../../config/constants';
import { NotFoundError, ValidationError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import type {
  DownloadedFile,
  FileRequester,
  IFileRepository,
  IFileService,
  StoredFileRecord,
  UploadFileInput,
} from './file.interface';
import type { IFileAccessPolicy } from './file.access-policy';
import type { IFileStorage } from './file.storage';

export class FileService implements IFileService {
  constructor(
    private readonly fileRepository: IFileRepository,
    private readonly storage: IFileStorage,
    private readonly accessPolicies: readonly IFileAccessPolicy[],
  ) {}

  async upload(ownerUserId: string, input: UploadFileInput): Promise<StoredFileRecord> {
    const allowed = ALLOWED_MIME_TYPES[input.kind];

    if (!allowed.includes(input.mimeType)) {
      throw new ValidationError(
        `A ${input.kind.replace('_', ' ')} must be one of: ${allowed.join(', ')}`,
        [{ field: 'file', message: `Unsupported file type "${input.mimeType}"` }],
        ERROR_CODES.UNSUPPORTED_FILE_TYPE,
      );
    }

    const storageKey = await this.storage.save({
      buffer: input.buffer,
      originalName: input.originalName,
      mimeType: input.mimeType,
    });

    return this.fileRepository.create({
      ownerUserId,
      kind: input.kind,
      storageKey,
      originalName: input.originalName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    });
  }

  /**
   * A file the requester may not open is reported as missing rather than forbidden, so
   * the response never confirms that someone else's file exists.
   */
  async download(id: string, requester: FileRequester): Promise<DownloadedFile> {
    const record = await this.fileRepository.findById(id);

    if (record === null || !this.isPermitted(record, requester)) {
      throw new NotFoundError('File not found', ERROR_CODES.FILE_NOT_FOUND);
    }

    return { record, content: await this.storage.read(record.storageKey) };
  }

  private isPermitted(record: StoredFileRecord, requester: FileRequester): boolean {
    return this.accessPolicies.some((policy) =>
      policy.allows({ record, requesterUserId: requester.userId, requesterRole: requester.role }),
    );
  }
}
