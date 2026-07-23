import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { httpClient } from '@/services/api-client';
import { JobsPage } from '@/pages/JobsPage';
import { useAuthStore } from '@/store/auth.store';
import { candidateUser, job, jobListResponse } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(httpClient);
});

afterEach(() => {
  mock.restore();
  // Browsing is the anonymous default; a test that signs in must not leak into the next.
  useAuthStore.setState({ user: null, accessToken: null, status: 'anonymous' });
});

/** The filter controls live behind the filter button now, so tests open the drawer. */
const openFilters = async (): Promise<void> => {
  await userEvent.click(screen.getByRole('button', { name: /Filters/ }));
  await screen.findByRole('dialog', { name: 'Filters' });
};

const lastRequestParams = (): Record<string, string> | undefined =>
  mock.history.get[mock.history.get.length - 1]?.params as Record<string, string> | undefined;

describe('JobsPage', () => {
  it('lists the jobs the API returns', async () => {
    mock
      .onGet('/jobs')
      .reply(200, jobListResponse([job(), job({ id: 'job-2', title: 'Designer' })]));

    renderWithProviders(<JobsPage />);

    expect(await screen.findByText('Senior Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Designer')).toBeInTheDocument();
  });

  it('reports the count beside the heading', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()], { total: 12 }));

    renderWithProviders(<JobsPage />);

    expect(await screen.findByText('12 roles')).toBeInTheDocument();
  });

  it('shows a skeleton while loading', () => {
    mock.onGet('/jobs').reply(() => new Promise(() => undefined));

    renderWithProviders(<JobsPage />);

    expect(screen.getByTestId('jobs-loading')).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([]));

    renderWithProviders(<JobsPage />);

    expect(await screen.findByText('No roles match these filters')).toBeInTheDocument();
  });

  it('surfaces a server failure', async () => {
    mock.onGet('/jobs').reply(500, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', details: [] },
    });

    renderWithProviders(<JobsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('searches on submit rather than on every keystroke', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()]));

    renderWithProviders(<JobsPage />);
    await screen.findByText('Senior Backend Engineer');
    const before = mock.history.get.length;

    const box = screen.getByRole('searchbox');
    await userEvent.type(box, 'acme');

    // Typing alone must not fire a request.
    expect(mock.history.get).toHaveLength(before);

    await userEvent.type(box, '{Enter}');

    await waitFor(() => {
      expect(lastRequestParams()).toMatchObject({ search: 'acme' });
    });
  });

  it('searches by company name through the same box', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()]));

    renderWithProviders(<JobsPage />, { route: '/jobs?search=Acme%20Corp' });

    await waitFor(() => {
      expect(mock.history.get[0]?.params).toMatchObject({ search: 'Acme Corp' });
    });
    expect(screen.getByRole('searchbox')).toHaveValue('Acme Corp');
  });

  it('clears the search from the box itself', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()]));

    renderWithProviders(<JobsPage />, { route: '/jobs?search=acme' });
    await screen.findByText('Senior Backend Engineer');

    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    await waitFor(() => {
      expect(lastRequestParams()).not.toHaveProperty('search');
    });
  });

  it('keeps the filters behind the filter button until it is pressed', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()]));

    renderWithProviders(<JobsPage />);
    await screen.findByText('Senior Backend Engineer');

    expect(screen.queryByLabelText('Role')).not.toBeInTheDocument();

    await openFilters();

    expect(screen.getByLabelText('Role')).toBeInTheDocument();
  });

  it.each([
    ['Role', 'role', 'design'],
    ['Job type', 'jobType', 'internship'],
    ['Work mode', 'workMode', 'remote'],
  ])('sends the %s filter from the drawer', async (label, param, value) => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()]));

    renderWithProviders(<JobsPage />);
    await screen.findByText('Senior Backend Engineer');
    await openFilters();

    await userEvent.selectOptions(screen.getByLabelText(label), value);

    await waitFor(() => {
      expect(lastRequestParams()).toMatchObject({ [param]: value, page: '1' });
    });
  });

  it.each([
    ['Location', 'location', 'Pune'],
    ['Minimum CTC', 'minCtc', '1800000'],
    ['My experience (years)', 'maxExperienceYears', '5'],
  ])('sends the %s filter from the drawer', async (label, param, value) => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()]));

    renderWithProviders(<JobsPage />);
    await screen.findByText('Senior Backend Engineer');
    await openFilters();

    await userEvent.type(screen.getByLabelText(label), value);

    await waitFor(() => {
      expect(lastRequestParams()).toMatchObject({ [param]: value });
    });
  });

  it('counts the active filters on the button', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()]));

    renderWithProviders(<JobsPage />, { route: '/jobs?role=design&workMode=remote' });

    expect(await screen.findByTestId('active-filter-count')).toHaveTextContent('2');
  });

  it('shows each active filter as a removable chip', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()]));

    renderWithProviders(<JobsPage />, { route: '/jobs?workMode=remote' });
    await screen.findByText('Senior Backend Engineer');

    // Labelled for a human, not by its query-string key.
    expect(screen.getByText('Remote')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Remove Remote filter' }));

    await waitFor(() => {
      expect(lastRequestParams()).not.toHaveProperty('workMode');
    });
  });

  it('clears every filter at once', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()]));

    renderWithProviders(<JobsPage />, { route: '/jobs?role=design&workMode=remote' });
    await screen.findByText('Senior Backend Engineer');

    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));

    await waitFor(() => {
      const params = lastRequestParams();
      expect(params).not.toHaveProperty('role');
      expect(params).not.toHaveProperty('workMode');
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
  });

  it('closes the drawer on Escape', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()]));

    renderWithProviders(<JobsPage />);
    await screen.findByText('Senior Backend Engineer');
    await openFilters();

    await userEvent.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Filters' })).not.toBeInTheDocument();
    });
  });

  it('pages forward and back', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()], { total: 45, totalPages: 3 }));

    renderWithProviders(<JobsPage />);
    await screen.findByText('Senior Backend Engineer');

    const pager = screen.getByRole('navigation', { name: 'Pagination' });
    expect(within(pager).getByText(/Page 1 of 3/)).toBeInTheDocument();
    expect(within(pager).getByRole('button', { name: 'Previous' })).toBeDisabled();

    await userEvent.click(within(pager).getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(lastRequestParams()).toMatchObject({ page: '2' });
    });
  });

  it('hides the pager when there are no results at all', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([]));

    renderWithProviders(<JobsPage />);
    await screen.findByText('No roles match these filters');

    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument();
  });

  it('offers the skills live listings ask for', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()]));
    mock
      .onGet('/jobs/skills')
      .reply(200, { success: true, data: { skills: ['TypeScript', 'React'] } });

    renderWithProviders(<JobsPage />);
    await screen.findByText('Senior Backend Engineer');
    await openFilters();

    expect(await screen.findByRole('checkbox', { name: 'TypeScript' })).toBeInTheDocument();
  });

  it('narrows the list by a ticked skill', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()]));
    mock.onGet('/jobs/skills').reply(200, { success: true, data: { skills: ['TypeScript'] } });

    renderWithProviders(<JobsPage />);
    await screen.findByText('Senior Backend Engineer');
    await openFilters();

    await userEvent.click(await screen.findByRole('checkbox', { name: 'TypeScript' }));

    await waitFor(() => {
      expect(lastRequestParams()).toMatchObject({ skills: 'TypeScript' });
    });
  });

  it('leaves the skill filter out entirely when no listing names a skill', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()]));
    mock.onGet('/jobs/skills').reply(200, { success: true, data: { skills: [] } });

    renderWithProviders(<JobsPage />);
    await screen.findByText('Senior Backend Engineer');
    await openFilters();

    expect(screen.queryByRole('group', { name: /Skills/ })).not.toBeInTheDocument();
  });

  it('marks a listing the candidate has already applied to', async () => {
    useAuthStore.setState({ user: candidateUser, accessToken: 'token', status: 'authenticated' });
    mock
      .onGet('/jobs')
      .reply(200, jobListResponse([job(), job({ id: 'job-2', title: 'Designer' })]));
    mock.onGet('/jobs/skills').reply(200, { success: true, data: { skills: [] } });
    mock.onGet('/applications/job-ids').reply(200, { success: true, data: { jobIds: ['job-1'] } });

    renderWithProviders(<JobsPage />);

    const applied = await screen.findByText('Applied');
    expect(applied).toBeInTheDocument();
    expect(screen.getAllByText('Applied')).toHaveLength(1);
  });

  it('does not ask about applications when nobody is signed in as a candidate', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([job()]));
    mock.onGet('/jobs/skills').reply(200, { success: true, data: { skills: [] } });

    renderWithProviders(<JobsPage />);
    await screen.findByText('Senior Backend Engineer');

    expect(mock.history.get.map((entry) => entry.url)).not.toContain('/applications/job-ids');
  });
});
