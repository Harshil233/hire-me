import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';

import { ROUTES } from '@/config/constants';
import { httpClient } from '@/services/api-client';
import { JobDetailPage } from '@/pages/JobDetailPage';
import { useAuthStore } from '@/store/auth.store';
import { candidateUser, hrUser, jobDetailResponse, myApplication } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(httpClient);
  useAuthStore.setState({ user: candidateUser, accessToken: 'token', status: 'authenticated' });
});

afterEach(() => {
  mock.restore();
});

const renderDetail = (): void => {
  renderWithProviders(
    <Routes>
      <Route path={ROUTES.JOB_DETAIL} element={<JobDetailPage />} />
    </Routes>,
    { route: '/jobs/job-1' },
  );
};

describe('applying from the job detail screen', () => {
  it('offers Apply to a candidate on a published listing', async () => {
    mock.onGet('/jobs/job-1').reply(200, jobDetailResponse());

    renderDetail();

    expect(await screen.findByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  it('does not offer Apply to an employer', async () => {
    useAuthStore.setState({ user: hrUser, accessToken: 'token', status: 'authenticated' });
    mock.onGet('/jobs/job-1').reply(200, jobDetailResponse());

    renderDetail();
    await screen.findByRole('heading', { name: 'Senior Backend Engineer' });

    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
  });

  it.each([['draft'], ['closed']] as const)(
    'does not offer Apply on a %s listing',
    async (status) => {
      mock.onGet('/jobs/job-1').reply(200, jobDetailResponse({ status }));

      renderDetail();
      await screen.findByRole('heading', { name: 'Senior Backend Engineer' });

      expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
    },
  );

  it('submits an application with a cover note and confirms', async () => {
    mock.onGet('/jobs/job-1').reply(200, jobDetailResponse());
    mock
      .onPost('/jobs/job-1/apply')
      .reply(201, { success: true, data: { application: myApplication() } });

    renderDetail();

    await userEvent.click(await screen.findByRole('button', { name: 'Apply' }));
    await userEvent.type(screen.getByLabelText(/Cover note/), 'Keen to join');
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    await waitFor(() => {
      expect(JSON.parse(mock.history.post[0]?.data as string)).toEqual({
        coverNote: 'Keen to join',
      });
    });
    expect(await screen.findByText('Application sent')).toBeInTheDocument();
  });

  it('applies without a cover note', async () => {
    mock.onGet('/jobs/job-1').reply(200, jobDetailResponse());
    mock
      .onPost('/jobs/job-1/apply')
      .reply(201, { success: true, data: { application: myApplication() } });

    renderDetail();

    await userEvent.click(await screen.findByRole('button', { name: 'Apply' }));
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    await waitFor(() => {
      expect(mock.history.post).toHaveLength(1);
    });
  });

  it('tells the candidate they have already applied', async () => {
    mock.onGet('/jobs/job-1').reply(200, jobDetailResponse());
    mock.onPost('/jobs/job-1/apply').reply(409, {
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'That record already exists',
        details: [],
      },
    });

    renderDetail();

    await userEvent.click(await screen.findByRole('button', { name: 'Apply' }));
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
    expect(screen.queryByText('Application sent')).not.toBeInTheDocument();
  });

  it('closes the dialog without applying when cancelled', async () => {
    mock.onGet('/jobs/job-1').reply(200, jobDetailResponse());

    renderDetail();

    await userEvent.click(await screen.findByRole('button', { name: 'Apply' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(mock.history.post).toHaveLength(0);
  });
});
