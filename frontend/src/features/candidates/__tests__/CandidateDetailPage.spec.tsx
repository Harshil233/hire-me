import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES, candidateDetailPath } from '@/config/constants';
import { CandidateDetailPage } from '@/pages/CandidateDetailPage';
import { httpClient } from '@/services/api-client';
import { candidateDetailResponse } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';

let mock: MockAdapter;

const EXPERIENCE = {
  id: 'exp-1',
  title: 'Backend Engineer',
  companyName: 'Kettle Payments',
  description: 'Owned the payments API end to end.',
  startDate: '2022-04-01T00:00:00.000Z',
  isCurrent: true,
  skills: ['TypeScript'],
  createdAt: '2022-04-01T00:00:00.000Z',
  updatedAt: '2022-04-01T00:00:00.000Z',
};

const EDUCATION = {
  id: 'edu-1',
  college: 'College of Engineering, Pune',
  course: 'Computer Engineering',
  degree: 'B.Tech',
  startDate: '2015-07-01T00:00:00.000Z',
  endDate: '2019-05-31T00:00:00.000Z',
  isCurrent: false,
  createdAt: '2019-05-31T00:00:00.000Z',
  updatedAt: '2019-05-31T00:00:00.000Z',
};

const renderPage = (userId = 'user-1'): void => {
  renderWithProviders(
    <Routes>
      <Route path={ROUTES.CANDIDATE_DETAIL} element={<CandidateDetailPage />} />
    </Routes>,
    { route: candidateDetailPath(userId) },
  );
};

beforeEach(() => {
  mock = new MockAdapter(httpClient);
});

afterEach(() => {
  mock.restore();
  vi.restoreAllMocks();
});

describe('candidate detail', () => {
  it('asks the API for the candidate in the URL', async () => {
    mock.onGet('/candidates/user-9').reply(200, candidateDetailResponse({ userId: 'user-9' }));

    renderPage('user-9');

    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
  });

  it('shows a loading state first', () => {
    mock.onGet(/\/candidates\//).reply(200, candidateDetailResponse());

    renderPage();

    expect(screen.getByTestId('candidate-loading')).toBeInTheDocument();
  });

  it('shows where they are and what they are open to', async () => {
    mock.onGet(/\/candidates\//).reply(200, candidateDetailResponse());

    renderPage();

    expect(await screen.findByText('Pune')).toBeInTheDocument();
    expect(screen.getByText(/Open to Full time/)).toBeInTheDocument();
    expect(screen.getByText(/Would work in Pune, Remote/)).toBeInTheDocument();
  });

  it('lists their skills', async () => {
    mock.onGet(/\/candidates\//).reply(200, candidateDetailResponse());

    renderPage();

    expect(await screen.findByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
  });

  it('renders the sections the candidate filled in', async () => {
    mock
      .onGet(/\/candidates\//)
      .reply(200, candidateDetailResponse({ experience: [EXPERIENCE], education: [EDUCATION] }));

    renderPage();

    expect(await screen.findByRole('heading', { name: /Work experience/ })).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Kettle Payments')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Education/ })).toBeInTheDocument();
    expect(screen.getByText('College of Engineering, Pune')).toBeInTheDocument();
  });

  it('leaves out a section the candidate left empty', async () => {
    mock
      .onGet(/\/candidates\//)
      .reply(200, candidateDetailResponse({ experience: [EXPERIENCE] }));

    renderPage();

    await screen.findByRole('heading', { name: /Work experience/ });
    expect(screen.queryByRole('heading', { name: /Certifications/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Projects/ })).not.toBeInTheDocument();
  });

  it('never offers editing controls on someone else’s profile', async () => {
    mock
      .onGet(/\/candidates\//)
      .reply(200, candidateDetailResponse({ experience: [EXPERIENCE] }));

    renderPage();

    await screen.findByText('Backend Engineer');
    expect(screen.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Delete/ })).not.toBeInTheDocument();
  });

  it('offers the résumé when there is one', async () => {
    mock
      .onGet(/\/candidates\//)
      .reply(200, candidateDetailResponse({ resumeFileId: 'file-7' }));

    renderPage();

    expect(await screen.findByRole('button', { name: /Résumé/ })).toBeInTheDocument();
  });

  it('hides the résumé button when the candidate has not uploaded one', async () => {
    mock.onGet(/\/candidates\//).reply(200, candidateDetailResponse());

    renderPage();

    await screen.findByRole('heading', { name: 'Ada Lovelace' });
    expect(screen.queryByRole('button', { name: /Résumé/ })).not.toBeInTheDocument();
  });

  it('downloads the résumé only once asked', async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:x', revokeObjectURL: () => undefined });
    mock
      .onGet(/\/candidates\//)
      .reply(200, candidateDetailResponse({ resumeFileId: 'file-7' }));
    mock.onGet('/files/file-7').reply(200, new Blob(['pdf']));

    renderPage();
    const button = await screen.findByRole('button', { name: /Résumé/ });

    expect(mock.history.get.some((entry) => entry.url === '/files/file-7')).toBe(false);

    await user.click(button);

    await waitFor(() => {
      expect(mock.history.get.some((entry) => entry.url === '/files/file-7')).toBe(true);
    });
    vi.unstubAllGlobals();
  });

  it('reports a candidate that cannot be opened', async () => {
    mock.onGet(/\/candidates\//).reply(404, {
      success: false,
      error: { code: 'PROFILE_NOT_FOUND', message: 'Candidate not found', details: [] },
    });

    renderPage();

    expect(await screen.findByText('Candidate not found')).toBeInTheDocument();
    expect(screen.getByText('We could not open this candidate')).toBeInTheDocument();
  });

  it('offers a way back to the pool from the error state', async () => {
    mock.onGet(/\/candidates\//).reply(500, {
      success: false,
      error: { code: 'INTERNAL', message: 'Something went wrong', details: [] },
    });

    renderPage();

    await screen.findByText('We could not open this candidate');
    expect(screen.getAllByRole('link', { name: /talent pool/ })[0]).toHaveAttribute(
      'href',
      ROUTES.CANDIDATES,
    );
  });
});
