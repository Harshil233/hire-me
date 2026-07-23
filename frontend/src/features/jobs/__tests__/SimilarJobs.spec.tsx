import { render, screen, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { JobTypeBadge } from '@/features/jobs/components/JobTypeBadge';
import { SimilarJobs } from '@/features/jobs/components/SimilarJobs';
import { httpClient } from '@/services/api-client';
import { job, jobListResponse } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';

let mock: MockAdapter;

const CURRENT = { id: 'job-1', role: 'engineering' };

beforeEach(() => {
  mock = new MockAdapter(httpClient);
});

afterEach(() => {
  mock.restore();
});

const lastParams = (): Record<string, string> | undefined =>
  mock.history.get[mock.history.get.length - 1]?.params as Record<string, string> | undefined;

describe('SimilarJobs', () => {
  it('offers other roles in the same discipline', async () => {
    mock
      .onGet('/jobs')
      .reply(200, jobListResponse([job({ id: 'job-2', title: 'Backend Engineer' })]));

    renderWithProviders(<SimilarJobs job={CURRENT} />);

    expect(await screen.findByRole('heading', { name: 'Similar roles' })).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
  });

  it('asks for the same role as the listing being read', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([job({ id: 'job-2' })]));

    renderWithProviders(<SimilarJobs job={CURRENT} />);

    await waitFor(() => {
      expect(lastParams()).toMatchObject({ role: 'engineering' });
    });
  });

  it('never suggests the listing you are already reading', async () => {
    mock
      .onGet('/jobs')
      .reply(
        200,
        jobListResponse([job({ id: 'job-1', title: 'This one' }), job({ id: 'job-2', title: 'Other' })]),
      );

    renderWithProviders(<SimilarJobs job={CURRENT} />);

    await screen.findByText('Other');
    expect(screen.queryByText('This one')).not.toBeInTheDocument();
  });

  it('renders nothing when there is no comparable role', async () => {
    mock.onGet('/jobs').reply(200, jobListResponse([]));

    renderWithProviders(<SimilarJobs job={CURRENT} />);

    await waitFor(() => {
      expect(screen.queryByTestId('similar-jobs-loading')).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Similar roles' })).not.toBeInTheDocument();
  });

  it('stays silent rather than showing an error under a listing', async () => {
    mock.onGet('/jobs').reply(500, {
      success: false,
      error: { code: 'INTERNAL', message: 'Something went wrong', details: [] },
    });

    renderWithProviders(<SimilarJobs job={CURRENT} />);

    await waitFor(() => {
      expect(screen.queryByTestId('similar-jobs-loading')).not.toBeInTheDocument();
    });
    expect(screen.queryByRole('heading', { name: 'Similar roles' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a placeholder while it loads', () => {
    mock.onGet('/jobs').reply(() => new Promise(() => undefined));

    renderWithProviders(<SimilarJobs job={CURRENT} />);

    expect(screen.getByTestId('similar-jobs-loading')).toBeInTheDocument();
  });
});

describe('JobTypeBadge', () => {
  it('names the employment type', () => {
    render(<JobTypeBadge jobType="internship" />);

    expect(screen.getByText('Internship')).toBeInTheDocument();
  });

  it('gives each type its own tint, so a scan can tell them apart', () => {
    const { container: permanent } = render(<JobTypeBadge jobType="full_time" />);
    const { container: temporary } = render(<JobTypeBadge jobType="contract" />);

    expect(permanent.firstElementChild?.className).not.toBe(
      temporary.firstElementChild?.className,
    );
  });
});
