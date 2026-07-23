import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES, candidateDetailPath } from '@/config/constants';
import { CandidateDetailPage } from '@/pages/CandidateDetailPage';
import { httpClient } from '@/services/api-client';
import { candidateDetailResponse, job, jobListResponse } from '@/test/fixtures';
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

  it('still shows a section the candidate left empty, so a gap is visible', async () => {
    mock.onGet(/\/candidates\//).reply(200, candidateDetailResponse({ experience: [EXPERIENCE] }));

    renderPage();

    await screen.findByRole('heading', { name: /Work experience/ });
    expect(screen.getByRole('heading', { name: /Certifications/ })).toBeInTheDocument();
    expect(screen.getByText('No certifications listed.')).toBeInTheDocument();
    expect(screen.getByText('No projects listed.')).toBeInTheDocument();
    expect(screen.getByText('No education listed.')).toBeInTheDocument();
  });

  it('covers every section a profile can have', async () => {
    mock.onGet(/\/candidates\//).reply(200, candidateDetailResponse());

    renderPage();

    await screen.findByRole('heading', { name: 'Ada Lovelace' });
    for (const title of [/Work experience/, /Education/, /Projects/, /Certifications/]) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
  });

  it('says so when a sparse profile lists no skills', async () => {
    mock.onGet(/\/candidates\//).reply(200, candidateDetailResponse({ skills: [] }));

    renderPage();

    expect(await screen.findByText('No skills listed.')).toBeInTheDocument();
  });

  it('says so when no location is shared', async () => {
    mock
      .onGet(/\/candidates\//)
      .reply(200, candidateDetailResponse({ currentLocation: undefined, preferredLocations: [] }));

    renderPage();

    expect(await screen.findByText('Location not shared')).toBeInTheDocument();
    expect(screen.getByText('No preferred locations listed')).toBeInTheDocument();
  });

  it('never offers editing controls on someone else’s profile', async () => {
    mock.onGet(/\/candidates\//).reply(200, candidateDetailResponse({ experience: [EXPERIENCE] }));

    renderPage();

    await screen.findByText('Backend Engineer');
    expect(screen.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Delete/ })).not.toBeInTheDocument();
  });

  it('offers reading and keeping the resume when there is one', async () => {
    mock.onGet(/\/candidates\//).reply(200, candidateDetailResponse({ resumeFileId: 'file-7' }));

    renderPage();

    expect(await screen.findByRole('button', { name: 'View resume' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Download Ada Lovelace’s resume' }),
    ).toBeInTheDocument();
  });

  it('says so rather than going quiet when there is no resume', async () => {
    mock.onGet(/\/candidates\//).reply(200, candidateDetailResponse());

    renderPage();

    expect(await screen.findByText('No resume uploaded')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View resume' })).not.toBeInTheDocument();
  });

  it('fetches the resume only once asked', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: () => 'blob:x',
      revokeObjectURL: () => undefined,
    });
    vi.stubGlobal('open', vi.fn());
    mock.onGet(/\/candidates\//).reply(200, candidateDetailResponse({ resumeFileId: 'file-7' }));
    mock.onGet('/files/file-7').reply(200, new Blob(['pdf']));

    renderPage();
    const button = await screen.findByRole('button', { name: 'View resume' });

    expect(mock.history.get.some((entry) => entry.url === '/files/file-7')).toBe(false);

    await user.click(button);

    await waitFor(() => {
      expect(mock.history.get.some((entry) => entry.url === '/files/file-7')).toBe(true);
    });
    vi.unstubAllGlobals();
  });

  it('confirms with a popup once the recruiter emails them', async () => {
    const user = userEvent.setup();
    mock.onGet('/candidates/user-1').reply(200, candidateDetailResponse({ userId: 'user-1' }));
    mock.onGet('/jobs/mine').reply(200, jobListResponse([job({ id: 'job-1', title: 'Backend' })]));
    mock.onPost('/outreach/campaigns/preview').reply(200, {
      success: true,
      data: { recipientCount: 1 },
    });
    mock.onPost('/outreach/campaigns').reply(201, {
      success: true,
      data: {
        campaign: {
          id: 'c1',
          jobId: 'job-1',
          subject: 's',
          body: 'b',
          status: 'queued',
          recipientCount: 1,
          sentCount: 0,
          failedCount: 0,
          skippedCount: 0,
          createdAt: '2026-07-20T10:00:00.000Z',
        },
      },
    });

    renderPage();
    await screen.findByRole('heading', { name: 'Ada Lovelace' });

    await user.click(screen.getByRole('button', { name: /Email Ada/ }));
    await screen.findByText(/1 person will be emailed/);
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByRole('heading', { name: 'Email sent' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View campaigns' })).toHaveAttribute(
      'href',
      ROUTES.OUTREACH,
    );
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
