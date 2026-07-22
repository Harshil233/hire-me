import { describe, expect, it } from 'vitest';

import { PAGINATION, VALIDATION_LIMITS } from '../../../config/constants';
import {
  createJobSchema,
  hrJobQuerySchema,
  jobQuerySchema,
  jobStatusSchema,
  updateJobSchema,
} from '../job.schema';

const VALID = {
  title: 'Senior Backend Engineer',
  description: 'Build and run the API.',
  role: 'engineering',
  jobType: 'full_time',
  workMode: 'hybrid',
};

describe('createJobSchema', () => {
  it('accepts a minimal posting and defaults the lists to empty', () => {
    const result = createJobSchema.parse(VALID);

    expect(result.skills).toEqual([]);
    expect(result.locations).toEqual([]);
  });

  it.each([
    ['role', 'astrology'],
    ['jobType', 'permanent'],
    ['workMode', 'moon'],
  ])('rejects an unknown %s', (field, value) => {
    expect(createJobSchema.safeParse({ ...VALID, [field]: value }).success).toBe(false);
  });

  it('requires a title and a description', () => {
    const result = createJobSchema.safeParse({ ...VALID, title: '   ', description: '' });

    expect(result.success).toBe(false);
    const fields = result.error?.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(expect.arrayContaining(['title', 'description']));
  });

  it('rejects a CTC ceiling below the floor', () => {
    const result = createJobSchema.safeParse({ ...VALID, ctcMin: 2_000_000, ctcMax: 1_000_000 });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['ctcMax']);
  });

  it('rejects an experience ceiling below the floor', () => {
    const result = createJobSchema.safeParse({
      ...VALID,
      experienceMinYears: 8,
      experienceMaxYears: 3,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['experienceMaxYears']);
  });

  it('accepts equal bounds and a bound supplied on its own', () => {
    expect(createJobSchema.safeParse({ ...VALID, ctcMin: 100, ctcMax: 100 }).success).toBe(true);
    expect(createJobSchema.safeParse({ ...VALID, ctcMin: 100 }).success).toBe(true);
    expect(createJobSchema.safeParse({ ...VALID, ctcMax: 100 }).success).toBe(true);
  });

  it('rejects an unrealistic experience requirement', () => {
    expect(
      createJobSchema.safeParse({
        ...VALID,
        experienceMinYears: VALIDATION_LIMITS.MAX_EXPERIENCE_YEARS + 1,
      }).success,
    ).toBe(false);
  });

  it('dedupes skills case-insensitively', () => {
    const result = createJobSchema.parse({ ...VALID, skills: ['TypeScript', 'typescript'] });

    expect(result.skills).toEqual(['TypeScript']);
  });

  it('strips a client-supplied companyId rather than honouring it', () => {
    const result = createJobSchema.parse({ ...VALID, companyId: 'someone-elses-company' });

    expect(result).not.toHaveProperty('companyId');
  });
});

describe('updateJobSchema', () => {
  it('accepts a single field', () => {
    expect(updateJobSchema.safeParse({ title: 'Staff Engineer' }).success).toBe(true);
  });

  it('rejects an empty body', () => {
    expect(updateJobSchema.safeParse({}).success).toBe(false);
  });

  it('still enforces the range rule on a partial update', () => {
    expect(updateJobSchema.safeParse({ ctcMin: 500, ctcMax: 100 }).success).toBe(false);
  });
});

describe('jobStatusSchema', () => {
  it.each([['draft'], ['published'], ['closed']])('accepts %s', (status) => {
    expect(jobStatusSchema.safeParse({ status }).success).toBe(true);
  });

  it('rejects anything else', () => {
    expect(jobStatusSchema.safeParse({ status: 'archived' }).success).toBe(false);
  });
});

describe('jobQuerySchema', () => {
  it('defaults the paging window', () => {
    const result = jobQuerySchema.parse({});

    expect(result.page).toBe(PAGINATION.DEFAULT_PAGE);
    expect(result.pageSize).toBe(PAGINATION.DEFAULT_PAGE_SIZE);
  });

  it('coerces numeric strings from the query string', () => {
    const result = jobQuerySchema.parse({ page: '3', pageSize: '50', minCtc: '1200000' });

    expect(result).toMatchObject({ page: 3, pageSize: 50, minCtc: 1_200_000 });
  });

  it('refuses a page size above the cap', () => {
    expect(
      jobQuerySchema.safeParse({ pageSize: String(PAGINATION.MAX_PAGE_SIZE + 1) }).success,
    ).toBe(false);
  });

  it('refuses a non-positive page', () => {
    expect(jobQuerySchema.safeParse({ page: '0' }).success).toBe(false);
    expect(jobQuerySchema.safeParse({ page: '-2' }).success).toBe(false);
  });

  it('splits a comma-separated skills list and drops blanks', () => {
    const result = jobQuerySchema.parse({ skills: 'typescript, , mongodb ,' });

    expect(result.skills).toEqual(['typescript', 'mongodb']);
  });

  it('caps how many skills a single query may filter on', () => {
    const many = Array.from({ length: VALIDATION_LIMITS.LIST_MAX_ITEMS + 10 }, (_, i) => `s${i}`);
    const result = jobQuerySchema.parse({ skills: many.join(',') });

    expect(result.skills).toHaveLength(VALIDATION_LIMITS.LIST_MAX_ITEMS);
  });

  // The injection surface: an operator object must never survive validation.
  it.each([
    ['role', { $ne: 'engineering' }],
    ['jobType', { $gt: '' }],
    ['workMode', { $regex: '.*' }],
    ['location', { $ne: null }],
    ['minCtc', { $gt: 0 }],
  ])('rejects an operator object supplied as %s', (field, value) => {
    expect(jobQuerySchema.safeParse({ [field]: value }).success).toBe(false);
  });

  it('rejects an array where a scalar is expected', () => {
    expect(jobQuerySchema.safeParse({ role: ['engineering', 'design'] }).success).toBe(false);
  });

  it('does not accept a status filter, so browse cannot reach drafts', () => {
    const result = jobQuerySchema.parse({ status: 'draft' });

    expect(result).not.toHaveProperty('status');
  });
});

describe('hrJobQuerySchema', () => {
  it('adds the status filter for an HR listing their own postings', () => {
    expect(hrJobQuerySchema.parse({ status: 'draft' }).status).toBe('draft');
  });

  it('still rejects an unknown status', () => {
    expect(hrJobQuerySchema.safeParse({ status: 'archived' }).success).toBe(false);
  });
});
