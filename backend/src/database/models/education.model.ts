import { Schema, model, type Types } from 'mongoose';

import { COLLECTIONS } from '../../config/constants';

export interface EducationDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  college: string;
  course: string;
  degree: string;
  description?: string | undefined;
  startDate: Date;
  endDate?: Date | undefined;
  isCurrent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const educationSchema = new Schema<EducationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    college: { type: String, required: true, trim: true },
    course: { type: String, required: true, trim: true },
    degree: { type: String, required: true, trim: true },
    description: { type: String, required: false, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: false },
    isCurrent: { type: Boolean, required: true, default: false },
  },
  { timestamps: true, collection: COLLECTIONS.EDUCATIONS },
);

educationSchema.index({ userId: 1, startDate: -1 });

export const EducationModel = model<EducationDocument>('Education', educationSchema);
