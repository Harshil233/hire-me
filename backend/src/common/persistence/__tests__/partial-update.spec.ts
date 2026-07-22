import { describe, expect, it } from 'vitest';

import { buildPartialUpdate } from '../partial-update';

describe('buildPartialUpdate', () => {
  it('sets supplied values', () => {
    expect(buildPartialUpdate({ firstName: 'Ada', skills: ['ts'] })).toEqual({
      $set: { firstName: 'Ada', skills: ['ts'] },
    });
  });

  it('unsets explicit nulls', () => {
    expect(buildPartialUpdate({ middleName: null })).toEqual({ $unset: { middleName: '' } });
  });

  it('ignores omitted keys', () => {
    expect(buildPartialUpdate({ firstName: undefined })).toEqual({});
  });

  it('mixes sets and unsets', () => {
    expect(buildPartialUpdate({ firstName: 'Ada', middleName: null, lastName: undefined })).toEqual(
      { $set: { firstName: 'Ada' }, $unset: { middleName: '' } },
    );
  });

  it('applies a per-field transformer only to set values', () => {
    const update = buildPartialUpdate(
      { resumeFileId: 'abc', profilePicFileId: null },
      { resumeFileId: (value) => `id:${String(value)}`, profilePicFileId: () => 'never' },
    );

    expect(update).toEqual({ $set: { resumeFileId: 'id:abc' }, $unset: { profilePicFileId: '' } });
  });

  it('keeps falsy-but-present values', () => {
    expect(buildPartialUpdate({ currentCtc: 0, isCurrent: false })).toEqual({
      $set: { currentCtc: 0, isCurrent: false },
    });
  });

  it('produces a no-op query when nothing was supplied', () => {
    expect(buildPartialUpdate({})).toEqual({});
  });
});
