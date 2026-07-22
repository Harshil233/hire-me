import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';

import { ROUTES } from '@/config/constants';
import { httpClient } from '@/services/api-client';
import { JobApplicantsPage } from '@/pages/JobApplicantsPage';
import { applicant, applicationListResponse, jobDetailResponse } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(httpClient);
  mock.onGet('/jobs/job-1').reply(200, jobDetailResponse());
});

afterEach(() => {
  mock.restore();
});

const renderPage = (): void => {
  renderWithProviders(
    <Routes>
      <Route path={ROUTES.HR_JOB_APPLICANTS} element={<JobApplicantsPage />} />
    </Routes>,
    { route: '/hr/jobs/job-1/applicants' },
  );
};

describe('JobApplicantsPage', () => {
  it('lists applicants with the job title and a count', async () => {
    mock.onGet('/jobs/job-1/applications').reply(200, applicationListResponse([applicant()]));

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Applicants for Senior Backend Engineer' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('1 application')).toBeInTheDocument();
  });

  it('shows the applicant’s skills and location', async () => {
    mock.onGet('/jobs/job-1/applications').reply(200, applicationListResponse([applicant()]));

    renderPage();
    await screen.findByText('Ada Lovelace');

    expect(screen.getByText('Pune')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('shows a cover note when one was sent', async () => {
    mock
      .onGet('/jobs/job-1/applications')
      .reply(200, applicationListResponse([applicant({ coverNote: 'Keen to join' })]));

    renderPage();

    expect(await screen.findByText('Keen to join')).toBeInTheDocument();
  });

  it('shows an empty state when nobody has applied', async () => {
    mock.onGet('/jobs/job-1/applications').reply(200, applicationListResponse([]));

    renderPage();

    expect(await screen.findByText('No applications yet')).toBeInTheDocument();
  });

  it.each([
    ['Shortlist', 'shortlisted'],
    ['Reject', 'rejected'],
  ])('%s sends the %s status', async (label, status) => {
    mock.onGet('/jobs/job-1/applications').reply(200, applicationListResponse([applicant()]));
    mock.onPatch('/applications/application-1/status').reply(200, {
      success: true,
      data: { application: { id: 'application-1', status } },
    });

    renderPage();
    await screen.findByText('Ada Lovelace');

    await userEvent.click(screen.getByRole('button', { name: label }));

    await waitFor(() => {
      expect(JSON.parse(mock.history.patch[0]?.data as string)).toEqual({ status });
    });
  });

  it('offers no actions for a withdrawn application', async () => {
    mock
      .onGet('/jobs/job-1/applications')
      .reply(200, applicationListResponse([applicant({ status: 'withdrawn' })]));

    renderPage();
    await screen.findByText('Ada Lovelace');

    expect(screen.queryByRole('button', { name: 'Shortlist' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject' })).not.toBeInTheDocument();
  });

  it('surfaces the 404 the API returns for another company’s job', async () => {
    mock.onGet('/jobs/job-1/applications').reply(404, {
      success: false,
      error: { code: 'JOB_NOT_FOUND', message: 'Job not found', details: [] },
    });

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Job not found');
  });

  it('surfaces a refused status change', async () => {
    mock.onGet('/jobs/job-1/applications').reply(200, applicationListResponse([applicant()]));
    mock.onPatch('/applications/application-1/status').reply(422, {
      success: false,
      error: {
        code: 'INVALID_STATUS_TRANSITION',
        message: 'Your account type cannot set an application to withdrawn',
        details: [],
      },
    });

    renderPage();
    await screen.findByText('Ada Lovelace');

    await userEvent.click(screen.getByRole('button', { name: 'Shortlist' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('cannot set an application');
  });

  it('links back to the postings list', async () => {
    mock.onGet('/jobs/job-1/applications').reply(200, applicationListResponse([]));

    renderPage();

    expect(
      await screen.findByRole('link', { name: '← Back to your postings' }),
    ).toBeInTheDocument();
  });
});
