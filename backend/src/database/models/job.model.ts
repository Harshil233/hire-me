import { Schema, model, type Types } from 'mongoose';

import {
  COLLECTIONS,
  JOB_ROLE_VALUES,
  JOB_STATUS_VALUES,
  JOB_STATUSES,
  JOB_TYPE_VALUES,
  WORK_MODE_VALUES,
  type JobRole,
  type JobStatus,
  type JobType,
  type WorkMode,
} from '../../config/constants';

export interface JobDocument {
  _id: Types.ObjectId;
  /** The company owns the listing; the poster is audit metadata. */
  companyId: Types.ObjectId;
  postedByUserId: Types.ObjectId;
  title: string;
  description: string;
  role: JobRole;
  jobType: JobType;
  workMode: WorkMode;
  skills: string[];
  locations: string[];
  ctcMin?: number | undefined;
  ctcMax?: number | undefined;
  experienceMinYears?: number | undefined;
  experienceMaxYears?: number | undefined;
  status: JobStatus;
  publishedAt?: Date | undefined;
  closedAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<JobDocument>(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, ref: 'Company' },
    postedByUserId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    role: { type: String, required: true, enum: JOB_ROLE_VALUES },
    jobType: { type: String, required: true, enum: JOB_TYPE_VALUES },
    workMode: { type: String, required: true, enum: WORK_MODE_VALUES },
    skills: { type: [String], required: true, default: [] },
    locations: { type: [String], required: true, default: [] },
    ctcMin: { type: Number, required: false },
    ctcMax: { type: Number, required: false },
    experienceMinYears: { type: Number, required: false },
    experienceMaxYears: { type: Number, required: false },
    status: {
      type: String,
      required: true,
      enum: JOB_STATUS_VALUES,
      default: JOB_STATUSES.DRAFT,
    },
    publishedAt: { type: Date, required: false },
    closedAt: { type: Date, required: false },
  },
  { timestamps: true, collection: COLLECTIONS.JOBS },
);

// Default candidate browse: published jobs, newest first.
jobSchema.index({ status: 1, publishedAt: -1 });
// Facet combinations offered by the filter sidebar.
jobSchema.index({ status: 1, role: 1, jobType: 1, workMode: 1 });
// An HR listing their own company's postings, drafts included.
jobSchema.index({ companyId: 1, status: 1, createdAt: -1 });
// Multikey index backing the skills filter.
jobSchema.index({ skills: 1 });
// Keyword search. Mongo permits only one text index per collection.
jobSchema.index({ title: 'text', description: 'text' });

export const JobModel = model<JobDocument>('Job', jobSchema);
