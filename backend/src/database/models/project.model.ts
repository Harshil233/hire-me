import { Schema, model, type Types } from 'mongoose';

import { COLLECTIONS } from '../../config/constants';

export interface ProjectDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  description?: string | undefined;
  skills: string[];
  domain?: string | undefined;
  link?: string | undefined;
  startDate: Date;
  endDate?: Date | undefined;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<ProjectDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: false, trim: true },
    skills: { type: [String], required: true, default: [] },
    domain: { type: String, required: false, trim: true },
    link: { type: String, required: false, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: false },
    isCurrent: { type: Boolean, required: true, default: false },
  },
  { timestamps: true, collection: COLLECTIONS.PROJECTS },
);

projectSchema.index({ userId: 1, startDate: -1 });

export const ProjectModel = model<ProjectDocument>('Project', projectSchema);
