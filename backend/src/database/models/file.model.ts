import { Schema, model, type Types } from 'mongoose';

import { COLLECTIONS, FILE_KIND_VALUES, type FileKind } from '../../config/constants';

export interface FileDocument {
  _id: Types.ObjectId;
  ownerUserId: Types.ObjectId;
  kind: FileKind;
  /** Opaque key resolved by the active `IFileStorage` implementation. */
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  updatedAt: Date;
}

const fileSchema = new Schema<FileDocument>(
  {
    ownerUserId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    kind: { type: String, required: true, enum: FILE_KIND_VALUES },
    storageKey: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
  },
  { timestamps: true, collection: COLLECTIONS.FILES },
);

export const FileModel = model<FileDocument>('File', fileSchema);
