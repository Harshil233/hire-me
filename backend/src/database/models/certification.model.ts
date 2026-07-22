import { Schema, model, type Types } from 'mongoose';

import { COLLECTIONS } from '../../config/constants';

export interface CertificationDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  issuedBy: string;
  issuedOn: Date;
  expiresOn?: Date | undefined;
  credentialUrl?: string | undefined;
  description?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const certificationSchema = new Schema<CertificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    title: { type: String, required: true, trim: true },
    issuedBy: { type: String, required: true, trim: true },
    issuedOn: { type: Date, required: true },
    expiresOn: { type: Date, required: false },
    credentialUrl: { type: String, required: false, trim: true },
    description: { type: String, required: false, trim: true },
  },
  { timestamps: true, collection: COLLECTIONS.CERTIFICATIONS },
);

certificationSchema.index({ userId: 1, issuedOn: -1 });

export const CertificationModel = model<CertificationDocument>(
  'Certification',
  certificationSchema,
);
