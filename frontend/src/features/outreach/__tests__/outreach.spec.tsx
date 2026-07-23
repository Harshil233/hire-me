import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CampaignRow } from '../components/CampaignRow';
import { ComposeCampaignModal } from '../components/ComposeCampaignModal';
import { httpClient } from '@/services/api-client';
import { job } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';
import type { Campaign } from '../schemas/outreach.schema';

let mock: MockAdapter;

const CAMPAIGN: Campaign = {
  id: 'campaign-1',
  jobId: 'job-1',
  subject: 'A role that might suit you',
  body: 'Hi there, we are hiring.',
  status: 'sent',
  recipientCount: 10,
  sentCount: 8,
  failedCount: 1,
  skippedCount: 1,
  createdAt: '2026-07-20T10:00:00.000Z',
};

beforeEach(() => {
  mock = new MockAdapter(httpClient);
  mock.onPost('/outreach/campaigns/preview').reply(200, {
    success: true,
    data: { recipientCount: 3 },
  });
});

afterEach(() => {
  mock.restore();
});

const openCompose = (overrides: Partial<Parameters<typeof ComposeCampaignModal>[0]> = {}) => {
  const onSend = vi.fn();
  renderWithProviders(
    <ComposeCampaignModal
      isOpen
      audience={{ kind: 'selection', candidateUserIds: ['cand-1'] }}
      jobs={[job({ id: 'job-1', title: 'Senior Backend Engineer' })]}
      isSending={false}
      error={null}
      onClose={vi.fn()}
      onSend={onSend}
      {...overrides}
    />,
  );
  return { onSend };
};

describe('ComposeCampaignModal', () => {
  it('counts the reach before anything is sent', async () => {
    openCompose();

    await waitFor(() => {
      expect(screen.getByTestId('audience-count')).toHaveTextContent('3 people will be emailed');
    });
  });

  it('prefills a subject and body from the chosen listing', () => {
    openCompose();

    expect(screen.getByLabelText('Subject')).toHaveValue(
      'Senior Backend Engineer at {{companyName}}',
    );
    expect((screen.getByLabelText('Message') as HTMLTextAreaElement).value).toContain(
      '{{firstName}}',
    );
  });

  it('says that each person gets their own message', () => {
    openCompose();

    expect(screen.getByText(/nobody sees who else was contacted/)).toBeInTheDocument();
  });

  it('sends the draft the recruiter composed', async () => {
    const user = userEvent.setup();
    const { onSend } = openCompose();

    await screen.findByText(/3 people/);
    await user.clear(screen.getByLabelText('Subject'));
    await user.type(screen.getByLabelText('Subject'), 'Come work with us');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(onSend).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: 'job-1', subject: 'Come work with us' }),
    );
  });

  it('refuses to send when the audience is empty', async () => {
    mock.onPost('/outreach/campaigns/preview').reply(200, {
      success: true,
      data: { recipientCount: 0 },
    });

    openCompose();

    await screen.findByText(/0 people/);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });

  it('explains itself when the employer has no published listing', () => {
    openCompose({ jobs: [] });

    expect(screen.getByText(/Publish a job first/)).toBeInTheDocument();
  });

  it('surfaces a rejection from the server', () => {
    openCompose({
      error: { message: 'Your company has reached its daily limit' } as never,
    });

    expect(screen.getByRole('alert')).toHaveTextContent('reached its daily limit');
  });
});

describe('CampaignRow', () => {
  it('shows the subject and how the send went', () => {
    render(<CampaignRow campaign={CAMPAIGN} />);

    expect(screen.getByRole('heading', { name: CAMPAIGN.subject })).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('separates people who opted out from messages that failed', () => {
    render(<CampaignRow campaign={CAMPAIGN} />);

    expect(screen.getByText('Opted out')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('leaves those counts out when they are zero', () => {
    render(<CampaignRow campaign={{ ...CAMPAIGN, failedCount: 0, skippedCount: 0 }} />);

    expect(screen.queryByText('Opted out')).not.toBeInTheDocument();
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
  });
});
