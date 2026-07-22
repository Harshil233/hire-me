import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { httpClient } from '@/services/api-client';
import { MyApplicationsPage } from '@/pages/MyApplicationsPage';
import { applicationListResponse, job, myApplication } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(httpClient);
});

afterEach(() => {
  mock.restore();
});

describe('MyApplicationsPage', () => {
  it('lists the applications with their listing and status', async () => {
    mock.onGet('/applications').reply(200, applicationListResponse([myApplication()]));

    renderWithProviders(<MyApplicationsPage />);

    expect(await screen.findByText('Senior Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByTestId('application-status')).toHaveTextContent('Applied');
  });

  it('shows a skeleton while loading', () => {
    mock.onGet('/applications').reply(() => new Promise(() => undefined));

    renderWithProviders(<MyApplicationsPage />);

    expect(screen.getByTestId('applications-loading')).toBeInTheDocument();
  });

  it('prompts the candidate to browse when they have applied to nothing', async () => {
    mock.onGet('/applications').reply(200, applicationListResponse([]));

    renderWithProviders(<MyApplicationsPage />);

    expect(await screen.findByText('You have not applied to anything yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Browse jobs' })).toBeInTheDocument();
  });

  it('surfaces a server failure', async () => {
    mock.onGet('/applications').reply(500, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', details: [] },
    });

    renderWithProviders(<MyApplicationsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('renders the label the candidate should see for a rejection', async () => {
    mock
      .onGet('/applications')
      .reply(200, applicationListResponse([myApplication({ status: 'rejected' })]));

    renderWithProviders(<MyApplicationsPage />);

    expect(await screen.findByTestId('application-status')).toHaveTextContent('Not selected');
  });

  it('withdraws an application', async () => {
    mock.onGet('/applications').reply(200, applicationListResponse([myApplication()]));
    mock.onPatch('/applications/application-1/status').reply(200, {
      success: true,
      data: { application: { id: 'application-1', status: 'withdrawn' } },
    });

    renderWithProviders(<MyApplicationsPage />);
    await screen.findByText('Senior Backend Engineer');

    await userEvent.click(screen.getByRole('button', { name: 'Withdraw' }));

    await waitFor(() => {
      expect(JSON.parse(mock.history.patch[0]?.data as string)).toEqual({ status: 'withdrawn' });
    });
  });

  it('offers no withdraw action once already withdrawn', async () => {
    mock
      .onGet('/applications')
      .reply(200, applicationListResponse([myApplication({ status: 'withdrawn' })]));

    renderWithProviders(<MyApplicationsPage />);
    await screen.findByText('Senior Backend Engineer');

    expect(screen.queryByRole('button', { name: 'Withdraw' })).not.toBeInTheDocument();
  });

  it('surfaces a refused withdrawal', async () => {
    mock.onGet('/applications').reply(200, applicationListResponse([myApplication()]));
    mock.onPatch('/applications/application-1/status').reply(422, {
      success: false,
      error: {
        code: 'INVALID_STATUS_TRANSITION',
        message: 'An application that is withdrawn cannot become withdrawn',
        details: [],
      },
    });

    renderWithProviders(<MyApplicationsPage />);
    await screen.findByText('Senior Backend Engineer');

    await userEvent.click(screen.getByRole('button', { name: 'Withdraw' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('cannot become withdrawn');
  });

  it('still shows an application whose listing has since closed', async () => {
    mock.onGet('/applications').reply(
      200,
      applicationListResponse([myApplication({ job: job({ status: 'closed' }) })]),
    );

    renderWithProviders(<MyApplicationsPage />);

    expect(await screen.findByText('Senior Backend Engineer')).toBeInTheDocument();
  });

  it('pages forward', async () => {
    mock
      .onGet('/applications')
      .reply(200, applicationListResponse([myApplication()], { total: 45, totalPages: 3 }));

    renderWithProviders(<MyApplicationsPage />);
    await screen.findByText('Senior Backend Engineer');

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      const last = mock.history.get[mock.history.get.length - 1];
      expect(last?.params).toMatchObject({ page: '2' });
    });
  });
});
