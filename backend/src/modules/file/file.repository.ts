import type { Model } from 'mongoose';

import { toIdString, toObjectId, toObjectIdOrNull } from '../../common/persistence/object-id';
import type { FileDocument } from '../../database/models/file.model';
import type { CreateFileRecordData, IFileRepository, StoredFileRecord } from './file.interface';

export class FileRepository implements IFileRepository {
  constructor(private readonly model: Model<FileDocument>) {}

  async create(data: CreateFileRecordData): Promise<StoredFileRecord> {
    const created = await this.model.create({
      ...data,
      ownerUserId: toObjectId(data.ownerUserId),
    });

    return FileRepository.toDomain(created.toObject<FileDocument>());
  }

  async findById(id: string): Promise<StoredFileRecord | null> {
    const objectId = toObjectIdOrNull(id);
    if (objectId === null) {
      return null;
    }

    const document = await this.model
      .findOne({ _id: objectId })
      .lean<FileDocument | null>()
      .exec();

    return document === null ? null : FileRepository.toDomain(document);
  }

  private static toDomain(document: FileDocument): StoredFileRecord {
    return {
      id: toIdString(document._id),
      ownerUserId: toIdString(document.ownerUserId),
      kind: document.kind,
      storageKey: document.storageKey,
      originalName: document.originalName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      createdAt: document.createdAt,
    };
  }
}
