import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { candidateDetailPath } from '@/config/constants';
import { httpClient } from '@/services/api-client';
import { CandidatesPage } from '@/pages/CandidatesPage';
import { candidate, candidateListResponse } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';
import type { Candidate } from '../schemas/candidate.schema';

let mock: MockAdapter;

const pool = (candidates: Candidate[], total = candidates.length): Record<string, unknown> =>
  candidateListResponse(candidates, {
    total,
    totalPages: Math.max(Math.ceil(total / 20), 1),
  });

const lastParams = (): Record<string, string> | undefined =>
  mock.history.get[mock.history.get.length - 1]?.params as Record<string, string> | undefined;

beforeEach(() => {
  mock = new MockAdapter(httpClient);
});

afterEach(() => {
  mock.restore();
});

describe('CandidatesPage', () => {
  it('lists the talent pool with skills and location', async () => {
    mock.onGet('/candidates').reply(200, pool([candidate()]));

    renderWithProviders(<CandidatesPage />);

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Pune')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('reports how many people are open to work', async () => {
    mock.onGet('/candidates').reply(200, pool([candidate()], 7));

    renderWithProviders(<CandidatesPage />);

    expect(await screen.findByText('7 people')).toBeInTheDocument();
  });

  it('shows a skeleton while loading', () => {
    mock.onGet('/candidates').reply(() => new Promise(() => undefined));

    renderWithProviders(<CandidatesPage />);

    expect(screen.getByTestId('candidates-loading')).toBeInTheDocument();
  });

  it('shows an empty state when nobody matches', async () => {
    mock.onGet('/candidates').reply(200, pool([]));

    renderWithProviders(<CandidatesPage />);

    expect(await screen.findByText('Nobody matches these filters')).toBeInTheDocument();
  });

  it('surfaces a server failure', async () => {
    mock.onGet('/candidates').reply(500, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', details: [] },
    });

    renderWithProviders(<CandidatesPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('searches on submit', async () => {
    mock.onGet('/candidates').reply(200, pool([candidate()]));

    renderWithProviders(<CandidatesPage />);
    await screen.findByText('Ada Lovelace');

    await userEvent.type(screen.getByRole('searchbox'), 'ada{Enter}');

    await waitFor(() => {
      expect(lastParams()).toMatchObject({ search: 'ada' });
    });
  });

  it('keeps the filters behind the filter button', async () => {
    mock.onGet('/candidates').reply(200, pool([candidate()]));

    renderWithProviders(<CandidatesPage />);
    await screen.findByText('Ada Lovelace');

    expect(screen.queryByLabelText('Skills')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));

    expect(await screen.findByLabelText('Skills')).toBeInTheDocument();
  });

  it.each([
    ['Skills', 'skills', 'TypeScript'],
    ['Location', 'location', 'Pune'],
  ])('sends the %s filter from the drawer', async (label, param, value) => {
    mock.onGet('/candidates').reply(200, pool([candidate()]));

    renderWithProviders(<CandidatesPage />);
    await screen.findByText('Ada Lovelace');
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));

    await userEvent.type(await screen.findByLabelText(label), value);

    await waitFor(() => {
      expect(lastParams()).toMatchObject({ [param]: value });
    });
  });

  it('sends the job-type filter', async () => {
    mock.onGet('/candidates').reply(200, pool([candidate()]));

    renderWithProviders(<CandidatesPage />);
    await screen.findByText('Ada Lovelace');
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));

    await userEvent.selectOptions(await screen.findByLabelText('Open to'), 'internship');

    await waitFor(() => {
      expect(lastParams()).toMatchObject({ jobType: 'internship' });
    });
  });

  it('shows active filters as removable chips', async () => {
    mock.onGet('/candidates').reply(200, pool([candidate()]));

    renderWithProviders(<CandidatesPage />, { route: '/candidates?location=Pune' });
    await screen.findByText('Ada Lovelace');

    await userEvent.click(screen.getByRole('button', { name: 'Remove Pune filter' }));

    await waitFor(() => {
      expect(lastParams()).not.toHaveProperty('location');
    });
  });

  it('truncates a long skill list rather than overflowing the card', async () => {
    mock
      .onGet('/candidates')
      .reply(
        200,
        pool([candidate({ skills: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] })]),
      );

    renderWithProviders(<CandidatesPage />);

    expect(await screen.findByText('+2 more')).toBeInTheDocument();
  });

  it('links each card through to that candidate', async () => {
    mock.onGet('/candidates').reply(200, pool([candidate({ userId: 'user-42' })]));

    renderWithProviders(<CandidatesPage />);

    expect(await screen.findByRole('link', { name: 'Ada Lovelace' })).toHaveAttribute(
      'href',
      candidateDetailPath('user-42'),
    );
  });

  it('offers the résumé straight from the card', async () => {
    mock.onGet('/candidates').reply(200, pool([candidate({ resumeFileId: 'file-7' })]));

    renderWithProviders(<CandidatesPage />);

    expect(await screen.findByRole('button', { name: 'View résumé' })).toBeInTheDocument();
  });

  it('leaves the résumé button off a card without one', async () => {
    mock.onGet('/candidates').reply(200, pool([candidate()]));

    renderWithProviders(<CandidatesPage />);

    await screen.findByText('Ada Lovelace');
    expect(screen.queryByRole('button', { name: 'View résumé' })).not.toBeInTheDocument();
  });

  it('pages forward', async () => {
    mock.onGet('/candidates').reply(200, pool([candidate()], 45));

    renderWithProviders(<CandidatesPage />);
    await screen.findByText('Ada Lovelace');

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    await waitFor(() => {
      expect(lastParams()).toMatchObject({ page: '2' });
    });
  });
});
