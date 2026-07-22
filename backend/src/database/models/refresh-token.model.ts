import { Schema, model, type Types } from 'mongoose';

import { COLLECTIONS } from '../../config/constants';

export interface RefreshTokenDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  /** SHA-256 of the token — the raw value is never stored. */
  tokenHash: string;
  jti: string;
  /** Rotation family: replaying a rotated token revokes every sibling. */
  family: string;
  expiresAt: Date;
  revokedAt?: Date | undefined;
  userAgent?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema<RefreshTokenDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    tokenHash: { type: String, required: true, unique: true },
    jti: { type: String, required: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, required: false },
    userAgent: { type: String, required: false },
  },
  { timestamps: true, collection: COLLECTIONS.REFRESH_TOKENS },
);

// Expired tokens are reaped by MongoDB itself.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = model<RefreshTokenDocument>('RefreshToken', refreshTokenSchema);
