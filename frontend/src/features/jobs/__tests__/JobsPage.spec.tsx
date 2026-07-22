import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { httpClient } from '@/services/api-client';
import { JobsPage } from '@/pages/JobsPage';
import { job, jobListResponse } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(httpClient);
});

afterEach(() => {
  mock.restore();
});

describe('JobsPage', () => {
  it('lists the jobs the API returns', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([job(), job({ id: 'job-2', title: 'Designer' })]));

    renderWithProviders(<JobsPage />);

    expect(await screen.findByText('Senior Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Designer')).toBeInTheDocument();
    expect(screen.getAllByText('Acme Corp').length).toBeGreaterThan(0);
  });

  it('shows a skeleton while loading', () => {
    mock.onGet('/jobs').reply(() => new Promise(() => undefined));

    renderWithProviders(<JobsPage />);

    expect(screen.getByTestId('jobs-loading')).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([]));

    renderWithProviders(<JobsPage />);

    expect(await screen.findByText('No jobs match these filters')).toBeInTheDocument();
  });

  it('surfaces a server failure', async () => {
    mock.onGet('/jobs').reply(500, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', details: [] },
    });

    renderWithProviders(<JobsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('sends the chosen role filter to the API and resets to page one', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()]));

    renderWithProviders(<JobsPage />, { route: '/jobs?page=3' });
    await screen.findByText('Senior Backend Engineer');

    await userEvent.selectOptions(screen.getByLabelText('Role'), 'design');

    await waitFor(() => {
      const last = mock.history.get[mock.history.get.length - 1];
      // Every filter is serialised as a string on the way out.
      expect(last?.params).toMatchObject({ role: 'design', page: '1' });
    });
  });

  it.each([
    ['Job type', 'jobType', 'internship'],
    ['Work mode', 'workMode', 'remote'],
  ])('sends the %s dropdown filter', async (label, param, value) => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()]));

    renderWithProviders(<JobsPage />);
    await screen.findByText('Senior Backend Engineer');

    await userEvent.selectOptions(screen.getByLabelText(label), value);

    await waitFor(() => {
      const last = mock.history.get[mock.history.get.length - 1];
      expect(last?.params).toMatchObject({ [param]: value });
    });
  });

  it('reads filters out of the URL on first load', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()]));

    renderWithProviders(<JobsPage />, { route: '/jobs?role=engineering&location=Pune' });

    await waitFor(() => {
      expect(mock.history.get[0]?.params).toMatchObject({
        role: 'engineering',
        location: 'Pune',
      });
    });
    expect(screen.getByLabelText('Location')).toHaveValue('Pune');
  });

  it('clears every filter but keeps the page', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()]));

    renderWithProviders(<JobsPage />, { route: '/jobs?role=engineering' });
    await screen.findByText('Senior Backend Engineer');

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() => {
      const last = mock.history.get[mock.history.get.length - 1];
      expect(last?.params).not.toHaveProperty('role');
    });
  });

  it('pages forward', async () => {
    mock
      .onGet('/jobs')
      .reply(200, jobListResponse([job()], { page: 1, total: 45, totalPages: 3 }));

    renderWithProviders(<JobsPage />);
    await screen.findByText('Senior Backend Engineer');

    const pager = screen.getByRole('navigation', { name: 'Pagination' });
    expect(within(pager).getByText(/Page 1 of 3/)).toBeInTheDocument();

    await userEvent.click(within(pager).getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      const last = mock.history.get[mock.history.get.length - 1];
      expect(last?.params).toMatchObject({ page: '2' });
    });
  });

  it('disables Previous on the first page', async () => {
    mock
      .onGet('/jobs')
      .reply(200, jobListResponse([job()], { page: 1, total: 45, totalPages: 3 }));

    renderWithProviders(<JobsPage />);
    await screen.findByText('Senior Backend Engineer');

    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  });

  it.each([
    ['Minimum CTC', 'minCtc', '1800000'],
    ['My experience (years)', 'maxExperienceYears', '5'],
    ['Location', 'location', 'Pune'],
    ['Search', 'search', 'backend'],
  ])('sends the %s filter', async (label, param, value) => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()]));

    renderWithProviders(<JobsPage />);
    await screen.findByText('Senior Backend Engineer');

    await userEvent.type(screen.getByLabelText(label), value);

    await waitFor(() => {
      const last = mock.history.get[mock.history.get.length - 1];
      expect(last?.params).toMatchObject({ [param]: value });
    });
  });

  it('pages back', async () => {
    mock
      .onGet('/jobs')
      .reply(200, jobListResponse([job()], { page: 2, total: 45, totalPages: 3 }));

    renderWithProviders(<JobsPage />, { route: '/jobs?page=2' });
    await screen.findByText('Senior Backend Engineer');

    await userEvent.click(screen.getByRole('button', { name: 'Previous' }));

    await waitFor(() => {
      const last = mock.history.get[mock.history.get.length - 1];
      // Page 1 drops out of the URL but is still sent explicitly to the API.
      expect(last?.params).toMatchObject({ page: '1' });
    });
  });

  it('hides the pager when there are no results at all', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([]));

    renderWithProviders(<JobsPage />);
    await screen.findByText('No jobs match these filters');

    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });
});
