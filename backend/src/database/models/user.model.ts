import { Schema, model, type Types } from 'mongoose';

import { COLLECTIONS, ROLE_VALUES, type Role } from '../../config/constants';

export interface UserDocument {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ROLE_VALUES },
    isActive: { type: Boolean, required: true, default: true },
    lastLoginAt: { type: Date, required: false },
  },
  { timestamps: true, collection: COLLECTIONS.USERS },
);

export const UserModel = model<UserDocument>('User', userSchema);
