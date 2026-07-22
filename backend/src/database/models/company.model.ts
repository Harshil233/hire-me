import { Schema, model, type Types } from 'mongoose';

import { COLLECTIONS } from '../../config/constants';

export interface CompanyDocument {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string | undefined;
  locations: string[];
  headquarters?: string | undefined;
  domain?: string | undefined;
  logoFileId?: Types.ObjectId | undefined;
  websiteUrl?: string | undefined;
  linkedinUrl?: string | undefined;
  facebookUrl?: string | undefined;
  instagramUrl?: string | undefined;
  googleMapsLink?: string | undefined;
  address?: string | undefined;
  createdByUserId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<CompanyDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: false, trim: true },
    locations: { type: [String], required: true, default: [] },
    headquarters: { type: String, required: false, trim: true },
    domain: { type: String, required: false, lowercase: true, trim: true },
    logoFileId: { type: Schema.Types.ObjectId, required: false, ref: 'File' },
    websiteUrl: { type: String, required: false, trim: true },
    linkedinUrl: { type: String, required: false, trim: true },
    facebookUrl: { type: String, required: false, trim: true },
    instagramUrl: { type: String, required: false, trim: true },
    googleMapsLink: { type: String, required: false, trim: true },
    address: { type: String, required: false, trim: true },
    createdByUserId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  },
  { timestamps: true, collection: COLLECTIONS.COMPANIES },
);

// A domain identifies a company when present, but is optional.
companySchema.index({ domain: 1 }, { unique: true, sparse: true });

export const CompanyModel = model<CompanyDocument>('Company', companySchema);
