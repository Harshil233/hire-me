import { Schema, model, type Types } from 'mongoose';

import {
  COLLECTIONS,
  GENDER_VALUES,
  JOB_TYPE_VALUES,
  type Gender,
  type JobType,
} from '../../config/constants';

export interface MobileSubdocument {
  countryCode: string;
  number: string;
}

export interface CandidateProfileDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  firstName: string;
  middleName?: string | undefined;
  lastName: string;
  profilePicFileId?: Types.ObjectId | undefined;
  mobile?: MobileSubdocument | undefined;
  gender?: Gender | undefined;
  dob?: Date | undefined;
  currentLocation?: string | undefined;
  preferredLocations: string[];
  skills: string[];
  jobTypes: JobType[];
  currentCtc?: number | undefined;
  expectedCtc?: number | undefined;
  resumeFileId?: Types.ObjectId | undefined;
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

const candidateProfileSchema = new Schema<CandidateProfileDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, unique: true, ref: 'User' },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, required: false, trim: true },
    lastName: { type: String, required: true, trim: true },
    profilePicFileId: { type: Schema.Types.ObjectId, required: false, ref: 'File' },
    mobile: { type: mobileSchema, required: false },
    gender: { type: String, required: false, enum: GENDER_VALUES },
    dob: { type: Date, required: false },
    currentLocation: { type: String, required: false, trim: true },
    preferredLocations: { type: [String], required: true, default: [] },
    skills: { type: [String], required: true, default: [] },
    jobTypes: { type: [String], required: true, default: [], enum: JOB_TYPE_VALUES },
    currentCtc: { type: Number, required: false },
    expectedCtc: { type: Number, required: false },
    resumeFileId: { type: Schema.Types.ObjectId, required: false, ref: 'File' },
  },
  { timestamps: true, collection: COLLECTIONS.CANDIDATE_PROFILES },
);

export const CandidateProfileModel = model<CandidateProfileDocument>(
  'CandidateProfile',
  candidateProfileSchema,
);
