import { Schema, model, type Types } from 'mongoose';

import { COLLECTIONS } from '../../config/constants';

export interface ExperienceDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  companyName: string;
  description?: string | undefined;
  startDate: Date;
  endDate?: Date | undefined;
  isCurrent: boolean;
  skills: string[];
  createdAt: Date;
  updatedAt: Date;
}

const experienceSchema = new Schema<ExperienceDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    title: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    description: { type: String, required: false, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: false },
    isCurrent: { type: Boolean, required: true, default: false },
    skills: { type: [String], required: true, default: [] },
  },
  { timestamps: true, collection: COLLECTIONS.EXPERIENCES },
);

experienceSchema.index({ userId: 1, startDate: -1 });

export const ExperienceModel = model<ExperienceDocument>('Experience', experienceSchema);
