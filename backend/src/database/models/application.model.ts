import { Schema, model, type Types } from 'mongoose';

import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_VALUES,
  COLLECTIONS,
  VALIDATION_LIMITS,
  type ApplicationStatus,
} from '../../config/constants';

export interface ApplicationDocument {
  _id: Types.ObjectId;
  jobId: Types.ObjectId;
  candidateUserId: Types.ObjectId;
  status: ApplicationStatus;
  /** Snapshot: whatever resume was current when the application was submitted. */
  resumeFileId?: Types.ObjectId | undefined;
  coverNote?: string | undefined;
  statusUpdatedAt: Date;
  statusUpdatedByUserId?: Types.ObjectId | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<ApplicationDocument>(
  {
    jobId: { type: Schema.Types.ObjectId, required: true, ref: 'Job' },
    candidateUserId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    status: {
      type: String,
      required: true,
      enum: APPLICATION_STATUS_VALUES,
      default: APPLICATION_STATUSES.APPLIED,
    },
    resumeFileId: { type: Schema.Types.ObjectId, required: false, ref: 'File' },
    coverNote: {
      type: String,
      required: false,
      trim: true,
      maxlength: VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH,
    },
    statusUpdatedAt: { type: Date, required: true },
    statusUpdatedByUserId: { type: Schema.Types.ObjectId, required: false, ref: 'User' },
  },
  { timestamps: true, collection: COLLECTIONS.APPLICATIONS },
);

// One application per candidate per job. The duplicate-key failure is translated to a
// 409 by the error middleware, so the race is closed in the database rather than by a
// read-then-write check that two concurrent requests could both pass.
applicationSchema.index({ jobId: 1, candidateUserId: 1 }, { unique: true });
// "My applications", newest first.
applicationSchema.index({ candidateUserId: 1, createdAt: -1 });
// The employer's applicant list for one job, optionally narrowed by status.
applicationSchema.index({ jobId: 1, status: 1, createdAt: -1 });

export const ApplicationModel = model<ApplicationDocument>('Application', applicationSchema);
