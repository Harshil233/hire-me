import { describe, expect, it } from 'vitest';

import { PAGINATION, VALIDATION_LIMITS } from '../../../config/constants';
import {
  applicationStatusSchema,
  applySchema,
  jobApplicantQuerySchema,
  myApplicationQuerySchema,
} from '../application.schema';

describe('applySchema', () => {
  it('accepts an empty body — a cover note is optional', () => {
    expect(applySchema.parse({})).toEqual({});
  });

  it('accepts a cover note', () => {
    expect(applySchema.parse({ coverNote: '  Keen to join  ' }).coverNote).toBe('Keen to join');
  });

  it('treats an empty cover note as absent', () => {
    expect(applySchema.parse({ coverNote: '' }).coverNote).toBeUndefined();
  });

  it('rejects an over-long cover note', () => {
    const tooLong = 'a'.repeat(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH + 1);

    expect(applySchema.safeParse({ coverNote: tooLong }).success).toBe(false);
  });

  it('strips fields the client is not allowed to choose', () => {
    const parsed = applySchema.parse({
      candidateUserId: 'someone-else',
      resumeFileId: 'someone-elses-file',
      status: 'shortlisted',
    });

    expect(parsed).not.toHaveProperty('candidateUserId');
    expect(parsed).not.toHaveProperty('resumeFileId');
    expect(parsed).not.toHaveProperty('status');
  });
});

describe('applicationStatusSchema', () => {
  it.each([['applied'], ['shortlisted'], ['rejected'], ['withdrawn']])('accepts %s', (status) => {
    expect(applicationStatusSchema.safeParse({ status }).success).toBe(true);
  });

  it.each([['hired'], ['interviewing'], [''], ['SHORTLISTED']])('rejects %s', (status) => {
    expect(applicationStatusSchema.safeParse({ status }).success).toBe(false);
  });

  it('rejects an operator object in place of a status', () => {
    expect(applicationStatusSchema.safeParse({ status: { $ne: 'rejected' } }).success).toBe(false);
  });
});

describe('application query schemas', () => {
  it.each([
    ['myApplicationQuerySchema', myApplicationQuerySchema],
    ['jobApplicantQuerySchema', jobApplicantQuerySchema],
  ])('%s defaults the paging window', (_name, schema) => {
    const parsed = schema.parse({});

    expect(parsed.page).toBe(PAGINATION.DEFAULT_PAGE);
    expect(parsed.pageSize).toBe(PAGINATION.DEFAULT_PAGE_SIZE);
  });

  it('coerces numeric strings from the query string', () => {
    expect(myApplicationQuerySchema.parse({ page: '2', pageSize: '5' })).toMatchObject({
      page: 2,
      pageSize: 5,
    });
  });

  it('caps the page size', () => {
    expect(
      myApplicationQuerySchema.safeParse({ pageSize: String(PAGINATION.MAX_PAGE_SIZE + 1) })
        .success,
    ).toBe(false);
  });

  it('rejects a non-positive page', () => {
    expect(myApplicationQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });

  it('accepts a known status filter and rejects an unknown one', () => {
    expect(myApplicationQuerySchema.parse({ status: 'shortlisted' }).status).toBe('shortlisted');
    expect(myApplicationQuerySchema.safeParse({ status: 'hired' }).success).toBe(false);
  });

  it('never lets a candidate filter by another candidate', () => {
    expect(
      myApplicationQuerySchema.parse({ candidateUserId: 'someone-else' }),
    ).not.toHaveProperty('candidateUserId');
  });
});
