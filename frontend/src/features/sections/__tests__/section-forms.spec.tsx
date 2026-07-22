import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import MockAdapter from 'axios-mock-adapter';

import { httpClient } from '@/services/api-client';
import { renderWithProviders } from '@/test/render';
import { SectionCard } from '../components/SectionCard';
import { certificationConfig } from '../configs/certification.config';
import { educationConfig } from '../configs/education.config';
import { projectConfig } from '../configs/project.config';
import { SectionItemRow } from '../components/SectionItemRow';

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(httpClient);
  mock.onGet('/profile').reply(200, { success: true, data: {} });
});

afterEach(() => {
  mock.restore();
});

describe('education form', () => {
  beforeEach(() => {
    mock.onGet('/education').reply(200, { success: true, data: { educations: [] } });
  });

  it('collects the college, degree and course', async () => {
    mock.onPost('/education').reply(201, {
      success: true,
      data: {
        education: {
          id: 'edu-1',
          college: 'IIT Bombay',
          course: 'Computer Science',
          degree: 'B.Tech',
          startDate: '2016-07-01T00:00:00.000Z',
          isCurrent: true,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    });

    renderWithProviders(<SectionCard config={educationConfig} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Add education' }));
    await userEvent.type(screen.getByLabelText(/College or university/), 'IIT Bombay');
    await userEvent.type(screen.getByLabelText(/Degree/), 'B.Tech');
    await userEvent.type(screen.getByLabelText(/Course/), 'Computer Science');
    await userEvent.type(screen.getByLabelText(/Start date/), '2016-07-01');
    await userEvent.click(screen.getByLabelText('I am still studying here'));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mock.history.post).toHaveLength(1);
    });
    expect(JSON.parse(mock.history.post[0]?.data as string)).toMatchObject({
      college: 'IIT Bombay',
      degree: 'B.Tech',
      isCurrent: true,
    });
  });

  it('requires every mandatory field', async () => {
    renderWithProviders(<SectionCard config={educationConfig} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Add education' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('College or university is required')).toBeInTheDocument();
    expect(screen.getByText('Degree is required')).toBeInTheDocument();
  });
});

describe('certification form', () => {
  beforeEach(() => {
    mock.onGet('/certification').reply(200, { success: true, data: { certifications: [] } });
  });

  it('rejects an expiry before the issue date', async () => {
    renderWithProviders(<SectionCard config={certificationConfig} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Add certification' }));
    await userEvent.type(screen.getByLabelText(/Certification/), 'AWS SA');
    await userEvent.type(screen.getByLabelText(/Issued by/), 'Amazon');
    await userEvent.type(screen.getByLabelText(/Issued on/), '2023-05-01');
    await userEvent.type(screen.getByLabelText(/Expires on/), '2022-01-01');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('End date must be after the start date')).toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
  });

  it('rejects a malformed credential URL', async () => {
    renderWithProviders(<SectionCard config={certificationConfig} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Add certification' }));
    await userEvent.type(screen.getByLabelText(/Certification/), 'AWS SA');
    await userEvent.type(screen.getByLabelText(/Issued by/), 'Amazon');
    await userEvent.type(screen.getByLabelText(/Issued on/), '2023-05-01');
    await userEvent.type(screen.getByLabelText(/Credential URL/), 'not-a-url');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/Enter a valid credential URL/)).toBeInTheDocument();
  });
});

describe('project form', () => {
  beforeEach(() => {
    mock.onGet('/project').reply(200, { success: true, data: { projects: [] } });
  });

  it('collects technologies as chips', async () => {
    renderWithProviders(<SectionCard config={projectConfig} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Add project' }));
    await userEvent.type(screen.getByLabelText(/Technologies/), 'React{Enter}');

    expect(screen.getByRole('button', { name: 'Remove React' })).toBeInTheDocument();
  });

  it('rejects a start date in the future', async () => {
    renderWithProviders(<SectionCard config={projectConfig} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Add project' }));
    await userEvent.type(screen.getByLabelText(/Project title/), 'Job portal');
    await userEvent.type(screen.getByLabelText(/Start date/), '2999-01-01');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Start date cannot be in the future')).toBeInTheDocument();
  });
});

describe('SectionItemRow', () => {
  const base = { id: 'row-1', title: 'Backend Engineer' };

  it('renders only the parts that are present', () => {
    renderWithProviders(
      <SectionItemRow
        view={base}
        isDeleting={false}
        onEdit={() => undefined}
        onDelete={() => undefined}
      />,
    );

    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View link' })).not.toBeInTheDocument();
  });

  it('renders the optional subtitle, meta, description, link and tags', () => {
    renderWithProviders(
      <SectionItemRow
        view={{
          ...base,
          subtitle: 'Acme',
          meta: 'Jan 2021 — Present',
          description: 'Owned payments',
          link: 'https://acme.test',
          tags: ['TypeScript'],
        }}
        isDeleting={false}
        onEdit={() => undefined}
        onDelete={() => undefined}
      />,
    );

    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Jan 2021 — Present')).toBeInTheDocument();
    expect(screen.getByText('Owned payments')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View link' })).toHaveAttribute(
      'href',
      'https://acme.test',
    );
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('shows a busy state while deleting', () => {
    renderWithProviders(
      <SectionItemRow view={base} isDeleting onEdit={() => undefined} onDelete={() => undefined} />,
    );

    expect(screen.getByRole('button', { name: /Delete Backend Engineer/ })).toBeDisabled();
  });
});
