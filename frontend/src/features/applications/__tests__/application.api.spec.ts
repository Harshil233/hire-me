import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ApiError } from '@/services/api-error';
import { applicant, applicationListResponse, myApplication } from '@/test/fixtures';
import { createApplicationApi } from '../api/application.api';

const client = axios.create();
let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(client);
});

afterEach(() => {
  mock.restore();
});

describe('createApplicationApi.apply', () => {
  it('posts to the job-scoped apply path', async () => {
    mock
      .onPost('/jobs/job-1/apply')
      .reply(201, { success: true, data: { application: myApplication() } });

    const result = await createApplicationApi(client).apply('job-1', { coverNote: 'Keen' });

    expect(result.id).toBe('application-1');
    expect(mock.history.post[0]?.url).toBe('/jobs/job-1/apply');
    expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({ coverNote: 'Keen' });
  });

  it('omits an empty cover note rather than sending a blank string', async () => {
    mock
      .onPost('/jobs/job-1/apply')
      .reply(201, { success: true, data: { application: myApplication() } });

    await createApplicationApi(client).apply('job-1', { coverNote: '   ' });

    expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({});
  });

  it('never sends a résumé or candidate id — the server decides both', async () => {
    mock
      .onPost('/jobs/job-1/apply')
      .reply(201, { success: true, data: { application: myApplication() } });

    await createApplicationApi(client).apply('job-1', { coverNote: 'Keen' });

    const body = JSON.parse(mock.history.post[0]?.data as string) as Record<string, unknown>;
    expect(body).not.toHaveProperty('resumeFileId');
    expect(body).not.toHaveProperty('candidateUserId');
  });
});

describe('createApplicationApi.listMine', () => {
  it('reads the candidate’s applications with their listings', async () => {
    mock.onGet('/applications').reply(200, applicationListResponse([myApplication()]));

    const result = await createApplicationApi(client).listMine({});

    expect(result.applications[0]?.job.title).toBe('Senior Backend Engineer');
    expect(result.pagination.total).toBe(1);
  });

  it('passes the filters as query params', async () => {
    mock.onGet('/applications').reply(200, applicationListResponse([]));

    await createApplicationApi(client).listMine({ page: 2, status: 'shortlisted' });

    expect(mock.history.get[0]?.params).toMatchObject({ page: '2', status: 'shortlisted' });
  });
});

describe('createApplicationApi.listForJob', () => {
  it('reads applicants from the job-scoped path', async () => {
    mock
      .onGet('/jobs/job-1/applications')
      .reply(200, applicationListResponse([applicant()]));

    const result = await createApplicationApi(client).listForJob('job-1', {});

    expect(result.applications[0]?.candidate.fullName).toBe('Ada Lovelace');
    expect(mock.history.get[0]?.url).toBe('/jobs/job-1/applications');
  });
});

describe('createApplicationApi.changeStatus', () => {
  it('patches the status and returns the new one', async () => {
    mock.onPatch('/applications/application-1/status').reply(200, {
      success: true,
      data: { application: { id: 'application-1', status: 'shortlisted' } },
    });

    const status = await createApplicationApi(client).changeStatus('application-1', 'shortlisted');

    expect(status).toBe('shortlisted');
    expect(JSON.parse(mock.history.patch[0]?.data as string)).toEqual({ status: 'shortlisted' });
  });

  it('rejects a response that does not match the contract', async () => {
    mock
      .onPatch('/applications/application-1/status')
      .reply(200, { success: true, data: { application: { id: 1 } } });

    await expect(
      createApplicationApi(client).changeStatus('application-1', 'rejected'),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
