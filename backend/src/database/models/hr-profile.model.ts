import { Schema, model, type Types } from 'mongoose';

import {
  COLLECTIONS,
  COMPANY_ROLE_VALUES,
  GENDER_VALUES,
  type CompanyRole,
  type Gender,
} from '../../config/constants';
import type { MobileSubdocument } from './candidate-profile.model';

export interface HrProfileDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** Absent only for an account whose company link has not been established yet. */
  companyId?: Types.ObjectId | undefined;
  companyRole: CompanyRole;
  firstName: string;
  middleName?: string | undefined;
  lastName: string;
  designation?: string | undefined;
  profilePicFileId?: Types.ObjectId | undefined;
  mobile?: MobileSubdocument | undefined;
  gender?: Gender | undefined;
  dob?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const mobileSchema = new Schema<MobileSubdocument>(
  {
    countryCode: { type: String, required: true },
    number: { type: String, required: true },
  },
  { _id: false },
);

const hrProfileSchema = new Schema<HrProfileDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, unique: true, ref: 'User' },
    companyId: { type: Schema.Types.ObjectId, required: false, ref: 'Company', index: true },
    companyRole: { type: String, required: true, enum: COMPANY_ROLE_VALUES },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, required: false, trim: true },
    lastName: { type: String, required: true, trim: true },
    designation: { type: String, required: false, trim: true },
    profilePicFileId: { type: Schema.Types.ObjectId, required: false, ref: 'File' },
    mobile: { type: mobileSchema, required: false },
    gender: { type: String, required: false, enum: GENDER_VALUES },
    dob: { type: Date, required: false },
  },
  { timestamps: true, collection: COLLECTIONS.HR_PROFILES },
);

export const HrProfileModel = model<HrProfileDocument>('HrProfile', hrProfileSchema);
