import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { httpClient } from '@/services/api-client';
import { HrJobsPage } from '@/pages/HrJobsPage';
import { job, jobDetailResponse, jobListResponse } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(httpClient);
});

afterEach(() => {
  mock.restore();
});

const fillRequiredFields = async (): Promise<void> => {
  await userEvent.type(screen.getByLabelText(/Title/), 'Staff Engineer');
  await userEvent.type(screen.getByLabelText(/Description/), 'Lead the platform team.');
};

describe('HrJobsPage', () => {
  it('lists the HR’s own postings with their status', async () => {
    mock.onGet('/jobs/mine').reply(200, jobListResponse([job({ status: 'draft' })]));

    renderWithProviders(<HrJobsPage />);

    expect(await screen.findByText('Senior Backend Engineer')).toBeInTheDocument();
    expect(screen.getByTestId('job-status')).toHaveTextContent('Draft');
  });

  it('prompts for a first posting when there are none', async () => {
    mock.onGet('/jobs/mine').reply(200, jobListResponse([]));

    renderWithProviders(<HrJobsPage />);

    expect(await screen.findByText('You have not posted a job yet')).toBeInTheDocument();
  });

  it('offers Publish for a draft and Close for a published job', async () => {
    mock.onGet('/jobs/mine').reply(200, jobListResponse([job({ status: 'draft' })]));

    renderWithProviders(<HrJobsPage />);
    await screen.findByText('Senior Backend Engineer');

    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
  });

  it('publishes a draft', async () => {
    mock.onGet('/jobs/mine').reply(200, jobListResponse([job({ status: 'draft' })]));
    mock.onPatch('/jobs/job-1/status').reply(200, jobDetailResponse({ status: 'published' }));

    renderWithProviders(<HrJobsPage />);
    await screen.findByText('Senior Backend Engineer');

    await userEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => {
      expect(JSON.parse(mock.history.patch[0]?.data as string)).toEqual({ status: 'published' });
    });
  });

  it('surfaces a rejected status change', async () => {
    mock.onGet('/jobs/mine').reply(200, jobListResponse([job({ status: 'published' })]));
    mock.onPatch('/jobs/job-1/status').reply(422, {
      success: false,
      error: {
        code: 'INVALID_STATUS_TRANSITION',
        message: 'A published job cannot become draft',
        details: [],
      },
    });

    renderWithProviders(<HrJobsPage />);
    await screen.findByText('Senior Backend Engineer');

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A published job cannot become draft',
    );
  });

  it('creates a job through the form', async () => {
    mock.onGet('/jobs/mine').reply(200, jobListResponse([]));
    mock.onPost('/jobs').reply(201, jobDetailResponse());

    renderWithProviders(<HrJobsPage />);
    await screen.findByText('You have not posted a job yet');

    await userEvent.click(screen.getByRole('button', { name: 'Post a job' }));
    await fillRequiredFields();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(JSON.parse(mock.history.post[0]?.data as string)).toMatchObject({
        title: 'Staff Engineer',
        role: 'engineering',
      });
    });
  });

  it('validates before sending anything to the server', async () => {
    mock.onGet('/jobs/mine').reply(200, jobListResponse([]));

    renderWithProviders(<HrJobsPage />);
    await screen.findByText('You have not posted a job yet');

    await userEvent.click(screen.getByRole('button', { name: 'Post a job' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
  });

  it('refuses a CTC ceiling below the floor before the round trip', async () => {
    mock.onGet('/jobs/mine').reply(200, jobListResponse([]));

    renderWithProviders(<HrJobsPage />);
    await screen.findByText('You have not posted a job yet');

    await userEvent.click(screen.getByRole('button', { name: 'Post a job' }));
    await fillRequiredFields();
    await userEvent.type(screen.getByLabelText('Minimum CTC'), '3000000');
    await userEvent.type(screen.getByLabelText('Maximum CTC'), '1000000');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Maximum CTC cannot be lower than the minimum'),
    ).toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
  });

  it('opens the edit form pre-filled with the existing posting', async () => {
    mock.onGet('/jobs/mine').reply(200, jobListResponse([job()]));
    mock.onPut('/jobs/job-1').reply(200, jobDetailResponse({ title: 'Updated' }));

    renderWithProviders(<HrJobsPage />);
    await screen.findByText('Senior Backend Engineer');

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByLabelText(/Title/)).toHaveValue('Senior Backend Engineer');
    expect(screen.getByLabelText('Minimum CTC')).toHaveValue('1800000');

    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mock.history.put[0]?.url).toBe('/jobs/job-1');
    });
  });

  it('closes the form without saving when cancelled', async () => {
    mock.onGet('/jobs/mine').reply(200, jobListResponse([]));

    renderWithProviders(<HrJobsPage />);
    await screen.findByText('You have not posted a job yet');

    await userEvent.click(screen.getByRole('button', { name: 'Post a job' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(mock.history.post).toHaveLength(0);
  });

  it('searches its own postings on submit', async () => {
    mock.onGet('/jobs/mine').reply(200, jobListResponse([job()]));

    renderWithProviders(<HrJobsPage />);
    await screen.findByText('Senior Backend Engineer');

    await userEvent.type(screen.getByRole('searchbox'), 'backend{Enter}');

    await waitFor(() => {
      const last = mock.history.get[mock.history.get.length - 1];
      expect(last?.params).toMatchObject({ search: 'backend' });
    });
  });

  it('keeps the status filter behind the filter button', async () => {
    mock.onGet('/jobs/mine').reply(200, jobListResponse([job()]));

    renderWithProviders(<HrJobsPage />);
    await screen.findByText('Senior Backend Engineer');

    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));
    await userEvent.selectOptions(await screen.findByLabelText('Status'), 'draft');

    await waitFor(() => {
      const last = mock.history.get[mock.history.get.length - 1];
      expect(last?.params).toMatchObject({ status: 'draft' });
    });
  });

  it('shows the status filter as a removable chip', async () => {
    mock.onGet('/jobs/mine').reply(200, jobListResponse([job()]));

    renderWithProviders(<HrJobsPage />, { route: '/hr/jobs?status=draft' });
    await screen.findByText('Senior Backend Engineer');

    await userEvent.click(screen.getByRole('button', { name: 'Remove Draft filter' }));

    await waitFor(() => {
      const last = mock.history.get[mock.history.get.length - 1];
      expect(last?.params).not.toHaveProperty('status');
    });
  });

  it('tells the employer when a filter hides everything, without offering "first job"', async () => {
    mock.onGet('/jobs/mine').reply(200, jobListResponse([]));

    renderWithProviders(<HrJobsPage />, { route: '/hr/jobs?status=closed' });

    expect(await screen.findByText('No postings match')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Post your first job' }),
    ).not.toBeInTheDocument();
  });

  it('links each posting to its applicants', async () => {
    mock.onGet('/jobs/mine').reply(200, jobListResponse([job()]));

    renderWithProviders(<HrJobsPage />);
    await screen.findByText('Senior Backend Engineer');

    expect(screen.getByRole('link', { name: /View applicants/ })).toHaveAttribute(
      'href',
      '/hr/jobs/job-1/applicants',
    );
  });

  it('pages through its postings', async () => {
    mock
      .onGet('/jobs/mine')
      .reply(200, jobListResponse([job()], { total: 45, totalPages: 3 }));

    renderWithProviders(<HrJobsPage />);
    await screen.findByText('Senior Backend Engineer');

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      const last = mock.history.get[mock.history.get.length - 1];
      expect(last?.params).toMatchObject({ page: '2' });
    });
  });
});
