import { Schema, model, type Types } from 'mongoose';

import {
  COLLECTIONS,
  NOTIFICATION_RESOURCE_KINDS,
  NOTIFICATION_TYPE_VALUES,
  VALIDATION_LIMITS,
  type NotificationResourceKind,
  type NotificationType,
} from '../../config/constants';

export interface NotificationDocument {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  /** What the notification is about, so the UI can link straight to it. */
  resourceKind: NotificationResourceKind;
  resourceId: Types.ObjectId;
  isRead: boolean;
  readAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    type: { type: String, required: true, enum: NOTIFICATION_TYPE_VALUES },
    title: { type: String, required: true, trim: true },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH,
    },
    resourceKind: { type: String, required: true, enum: NOTIFICATION_RESOURCE_KINDS },
    resourceId: { type: Schema.Types.ObjectId, required: true },
    isRead: { type: Boolean, required: true, default: false },
    readAt: { type: Date, required: false },
  },
  { timestamps: true, collection: COLLECTIONS.NOTIFICATIONS },
);

// The bell: this user's newest notifications.
notificationSchema.index({ userId: 1, createdAt: -1 });
// The unread badge count.
notificationSchema.index({ userId: 1, isRead: 1 });

export const NotificationModel = model<NotificationDocument>('Notification', notificationSchema);
