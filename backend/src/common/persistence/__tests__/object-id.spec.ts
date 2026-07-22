import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';

import { isObjectIdString, toIdString, toObjectId, toObjectIdOrNull } from '../object-id';

const VALID = '507f1f77bcf86cd799439011';

describe('object-id helpers', () => {
  it('recognises a valid id string', () => {
    expect(isObjectIdString(VALID)).toBe(true);
    expect(isObjectIdString('nope')).toBe(false);
    expect(isObjectIdString('')).toBe(false);
  });

  it('converts to and from an ObjectId', () => {
    const objectId = toObjectId(VALID);

    expect(objectId).toBeInstanceOf(Types.ObjectId);
    expect(toIdString(objectId)).toBe(VALID);
  });

  it('returns null for a malformed id instead of throwing', () => {
    expect(toObjectIdOrNull('malformed')).toBeNull();
    expect(toObjectIdOrNull(VALID)).toBeInstanceOf(Types.ObjectId);
  });
});
