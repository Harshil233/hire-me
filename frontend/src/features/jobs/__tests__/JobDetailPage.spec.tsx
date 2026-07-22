import { screen } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';

import { ROUTES } from '@/config/constants';
import { httpClient } from '@/services/api-client';
import { JobDetailPage } from '@/pages/JobDetailPage';
import { jobDetailResponse } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(httpClient);
});

afterEach(() => {
  mock.restore();
});

/** The page reads `:id` from the route, so it is mounted through a matching path. */
const renderAt = (id: string): void => {
  renderWithProviders(
    <Routes>
      <Route path={ROUTES.JOB_DETAIL} element={<JobDetailPage />} />
    </Routes>,
    { route: `/jobs/${id}` },
  );
};

describe('JobDetailPage', () => {
  it('renders the posting with its company and description', async () => {
    mock.onGet('/jobs/job-1').reply(200, jobDetailResponse());

    renderAt('job-1');

    expect(
      await screen.findByRole('heading', { name: 'Senior Backend Engineer' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Own the API from schema to production.')).toBeInTheDocument();
  });

  it('shows the role, type, mode and both ranges', async () => {
    mock.onGet('/jobs/job-1').reply(200, jobDetailResponse());

    renderAt('job-1');
    await screen.findByRole('heading', { name: 'Senior Backend Engineer' });

    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Full time')).toBeInTheDocument();
    expect(screen.getByText('Hybrid')).toBeInTheDocument();
    expect(screen.getByText('4 – 8 yrs')).toBeInTheDocument();
  });

  it('omits a range the posting does not state', async () => {
    mock.onGet('/jobs/job-1').reply(
      200,
      jobDetailResponse({
        ctcMin: undefined,
        ctcMax: undefined,
        experienceMinYears: undefined,
        experienceMaxYears: undefined,
      }),
    );

    renderAt('job-1');
    await screen.findByRole('heading', { name: 'Senior Backend Engineer' });

    expect(screen.queryByText('CTC')).not.toBeInTheDocument();
    expect(screen.queryByText('Experience')).not.toBeInTheDocument();
  });

  it('lists the skills', async () => {
    mock.onGet('/jobs/job-1').reply(200, jobDetailResponse());

    renderAt('job-1');
    await screen.findByRole('heading', { name: 'Senior Backend Engineer' });

    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('MongoDB')).toBeInTheDocument();
  });

  it('omits the skills block when there are none', async () => {
    mock.onGet('/jobs/job-1').reply(200, jobDetailResponse({ skills: [] }));

    renderAt('job-1');
    await screen.findByRole('heading', { name: 'Senior Backend Engineer' });

    expect(screen.queryByRole('heading', { name: 'Skills' })).not.toBeInTheDocument();
  });

  it('reports a job it cannot see as an error, with a way back', async () => {
    mock.onGet('/jobs/job-1').reply(404, {
      success: false,
      error: { code: 'JOB_NOT_FOUND', message: 'Job not found', details: [] },
    });

    renderAt('job-1');

    expect(await screen.findByRole('alert')).toHaveTextContent('Job not found');
    expect(screen.getByRole('link', { name: 'Back to jobs' })).toBeInTheDocument();
  });
});
