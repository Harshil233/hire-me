import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { JOBS_PAGE_SIZE } from '@/config/constants';
import { ApiError } from '@/services/api-error';
import { job, jobDetailResponse, jobListResponse } from '@/test/fixtures';
import { createJobApi, toJobPayload, toQueryParams } from '../api/job.api';
import type { JobFormValues } from '../schemas/job.schema';

const client = axios.create();
let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(client);
});

afterEach(() => {
  mock.restore();
});

const FORM: JobFormValues = {
  title: 'Senior Backend Engineer',
  description: 'Own the API.',
  role: 'engineering',
  jobType: 'full_time',
  workMode: 'hybrid',
  skills: ['TypeScript'],
  locations: ['Pune'],
  ctcMin: '1800000',
  ctcMax: '2800000',
  experienceMinYears: '4',
  experienceMaxYears: '8',
};

describe('toQueryParams', () => {
  it('always sends the page size', () => {
    expect(toQueryParams({})).toEqual({ pageSize: String(JOBS_PAGE_SIZE) });
  });

  it('drops blank and undefined filters so the URL carries only real choices', () => {
    const params = toQueryParams({ role: 'engineering', location: '', search: undefined, page: 2 });

    expect(params).toEqual({
      pageSize: String(JOBS_PAGE_SIZE),
      role: 'engineering',
      page: '2',
    });
  });

  it('drops a whitespace-only filter', () => {
    expect(toQueryParams({ location: '   ' })).not.toHaveProperty('location');
  });
});

describe('toJobPayload', () => {
  it('converts numeric strings to numbers', () => {
    expect(toJobPayload(FORM)).toMatchObject({
      ctcMin: 1_800_000,
      ctcMax: 2_800_000,
      experienceMinYears: 4,
      experienceMaxYears: 8,
    });
  });

  it('sends an unspecified bound as undefined rather than zero', () => {
    const payload = toJobPayload({ ...FORM, ctcMin: '', experienceMaxYears: '' });

    expect(payload.ctcMin).toBeUndefined();
    expect(payload.experienceMaxYears).toBeUndefined();
    expect(payload.ctcMin).not.toBe(0);
  });

  it('never forwards a company id', () => {
    expect(toJobPayload(FORM)).not.toHaveProperty('companyId');
  });
});

describe('createJobApi', () => {
  it('browses with the filters as query params', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()]));

    const result = await createJobApi(client).browse({ role: 'engineering' });

    expect(result.jobs).toHaveLength(1);
    expect(mock.history.get[0]?.params).toMatchObject({ role: 'engineering' });
  });

  it('lists the HR’s own postings from a separate path', async () => {
    mock.onGet('/jobs/mine').reply(200, jobListResponse([job({ status: 'draft' })]));

    const result = await createJobApi(client).listMine({});

    expect(result.jobs[0]?.status).toBe('draft');
    expect(mock.history.get[0]?.url).toBe('/jobs/mine');
  });

  it('reads one job', async () => {
    mock.onGet('/jobs/job-1').reply(200, jobDetailResponse());

    await expect(createJobApi(client).getById('job-1')).resolves.toMatchObject({ id: 'job-1' });
  });

  it('creates a job', async () => {
    mock.onPost('/jobs').reply(201, jobDetailResponse());

    await createJobApi(client).create(FORM);

    expect(JSON.parse(mock.history.post[0]?.data as string)).toMatchObject({
      title: 'Senior Backend Engineer',
      ctcMin: 1_800_000,
    });
  });

  it('updates a job', async () => {
    mock.onPut('/jobs/job-1').reply(200, jobDetailResponse({ title: 'Staff Engineer' }));

    await expect(createJobApi(client).update('job-1', FORM)).resolves.toMatchObject({
      title: 'Staff Engineer',
    });
  });

  it('changes the status', async () => {
    mock.onPatch('/jobs/job-1/status').reply(200, jobDetailResponse({ status: 'closed' }));

    await createJobApi(client).changeStatus('job-1', 'closed');

    expect(JSON.parse(mock.history.patch[0]?.data as string)).toEqual({ status: 'closed' });
  });

  it('rejects a response that does not match the contract', async () => {
    mock.onGet('/jobs').reply(200, { success: true, data: { jobs: [{ id: 1 }] } });

    await expect(createJobApi(client).browse({})).rejects.toBeInstanceOf(ApiError);
  });

  it('reads the skill facet', async () => {
    mock
      .onGet('/jobs/skills')
      .reply(200, { success: true, data: { skills: ['TypeScript', 'React'] } });

    await expect(createJobApi(client).listSkills()).resolves.toEqual(['TypeScript', 'React']);
  });

  it('rejects a skill facet that does not match the contract', async () => {
    mock.onGet('/jobs/skills').reply(200, { success: true, data: { skills: [7] } });

    await expect(createJobApi(client).listSkills()).rejects.toBeInstanceOf(ApiError);
  });
});
