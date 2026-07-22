import { ALLOWED_MIME_TYPES } from '../../config/constants';
import { NotFoundError, ValidationError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import type {
  DownloadedFile,
  IFileRepository,
  IFileService,
  StoredFileRecord,
  UploadFileInput,
} from './file.interface';
import type { IFileStorage } from './file.storage';

export class FileService implements IFileService {
  constructor(
    private readonly fileRepository: IFileRepository,
    private readonly storage: IFileStorage,
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

  async download(id: string, requesterUserId: string): Promise<DownloadedFile> {
    const record = await this.fileRepository.findByIdForOwner(id, requesterUserId);

    if (record === null) {
      throw new NotFoundError('File not found', ERROR_CODES.FILE_NOT_FOUND);
    }

    return { record, content: await this.storage.read(record.storageKey) };
  }
}
