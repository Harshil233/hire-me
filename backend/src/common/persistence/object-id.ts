import { Types } from 'mongoose';

import { OBJECT_ID_PATTERN } from '../validation/fields';

/** Identifier helpers shared by every repository. */

export const isObjectIdString = (value: string): boolean => OBJECT_ID_PATTERN.test(value);

export const toObjectId = (value: string): Types.ObjectId => new Types.ObjectId(value);

/** Returns `null` for malformed ids so repositories answer "not found" instead of throwing. */
export const toObjectIdOrNull = (value: string): Types.ObjectId | null =>
  isObjectIdString(value) ? new Types.ObjectId(value) : null;

export const toIdString = (value: Types.ObjectId): string => value.toHexString();
