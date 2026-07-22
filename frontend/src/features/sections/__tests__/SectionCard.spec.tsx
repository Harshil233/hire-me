import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import MockAdapter from 'axios-mock-adapter';

import { httpClient } from '@/services/api-client';
import { renderWithProviders } from '@/test/render';
import { SectionCard } from '../components/SectionCard';
import { experienceConfig } from '../configs/experience.config';

let mock: MockAdapter;

const EXPERIENCE = {
  id: 'exp-1',
  title: 'Backend Engineer',
  companyName: 'Acme',
  startDate: '2021-01-01T00:00:00.000Z',
  endDate: '2023-01-01T00:00:00.000Z',
  isCurrent: false,
  skills: ['TypeScript'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  mock = new MockAdapter(httpClient);
  mock.onGet('/profile').reply(200, { success: true, data: {} });
});

afterEach(() => {
  mock.restore();
});

const fillRequiredFields = async (): Promise<void> => {
  await userEvent.type(screen.getByLabelText(/Job title/), 'Backend Engineer');
  await userEvent.type(screen.getByLabelText(/Company/), 'Acme');
  await userEvent.type(screen.getByLabelText(/Start date/), '2021-01-01');
};

describe('SectionCard', () => {
  it('shows a skeleton, then the empty state', async () => {
    mock.onGet('/experience').reply(200, { success: true, data: { experiences: [] } });

    renderWithProviders(<SectionCard config={experienceConfig} />);

    expect(await screen.findByText('No work experience added yet')).toBeInTheDocument();
  });

  it('lists existing records', async () => {
    mock.onGet('/experience').reply(200, { success: true, data: { experiences: [EXPERIENCE] } });

    renderWithProviders(<SectionCard config={experienceConfig} />);

    expect(await screen.findByText('Backend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('reports a failed load', async () => {
    mock.onGet('/experience').reply(500, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', details: [] },
    });

    renderWithProviders(<SectionCard config={experienceConfig} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('creates a record through the modal', async () => {
    mock.onGet('/experience').reply(200, { success: true, data: { experiences: [] } });
    mock.onPost('/experience').reply(201, { success: true, data: { experience: EXPERIENCE } });

    renderWithProviders(<SectionCard config={experienceConfig} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Add experience' }));
    await fillRequiredFields();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mock.history.post).toHaveLength(1);
    });
    expect(JSON.parse(mock.history.post[0]?.data as string)).toMatchObject({
      title: 'Backend Engineer',
      companyName: 'Acme',
    });
  });

  it('validates in the modal before calling the API', async () => {
    mock.onGet('/experience').reply(200, { success: true, data: { experiences: [] } });

    renderWithProviders(<SectionCard config={experienceConfig} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Add experience' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Job title is required')).toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
  });

  it('disables the end date once the role is marked ongoing', async () => {
    mock.onGet('/experience').reply(200, { success: true, data: { experiences: [] } });

    renderWithProviders(<SectionCard config={experienceConfig} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Add experience' }));

    await userEvent.click(screen.getByLabelText('I currently work here'));

    expect(screen.getByLabelText(/End date/)).toBeDisabled();
  });

  it('opens the modal pre-filled when editing', async () => {
    mock.onGet('/experience').reply(200, { success: true, data: { experiences: [EXPERIENCE] } });
    mock.onPut('/experience/exp-1').reply(200, {
      success: true,
      data: { experience: { ...EXPERIENCE, title: 'Senior Engineer' } },
    });

    renderWithProviders(<SectionCard config={experienceConfig} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Backend Engineer' }));
    expect(screen.getByLabelText(/Job title/)).toHaveValue('Backend Engineer');

    await userEvent.clear(screen.getByLabelText(/Job title/));
    await userEvent.type(screen.getByLabelText(/Job title/), 'Senior Engineer');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(mock.history.put).toHaveLength(1);
    });
    expect(mock.history.put[0]?.url).toBe('/experience/exp-1');
  });

  it('deletes a record', async () => {
    mock.onGet('/experience').reply(200, { success: true, data: { experiences: [EXPERIENCE] } });
    mock.onDelete('/experience/exp-1').reply(204);

    renderWithProviders(<SectionCard config={experienceConfig} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Backend Engineer' }));

    await waitFor(() => {
      expect(mock.history.delete).toHaveLength(1);
    });
  });

  it('reports a failed delete', async () => {
    mock.onGet('/experience').reply(200, { success: true, data: { experiences: [EXPERIENCE] } });
    mock.onDelete('/experience/exp-1').reply(404, {
      success: false,
      error: { code: 'RESOURCE_NOT_FOUND', message: 'Experience not found', details: [] },
    });

    renderWithProviders(<SectionCard config={experienceConfig} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Backend Engineer' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Experience not found');
  });

  it('shows a server error inside the modal without closing it', async () => {
    mock.onGet('/experience').reply(200, { success: true, data: { experiences: [] } });
    mock.onPost('/experience').reply(500, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong', details: [] },
    });

    renderWithProviders(<SectionCard config={experienceConfig} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Add experience' }));
    await fillRequiredFields();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    const dialog = await screen.findByRole('dialog');
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('closes the modal on cancel', async () => {
    mock.onGet('/experience').reply(200, { success: true, data: { experiences: [] } });

    renderWithProviders(<SectionCard config={experienceConfig} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Add experience' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
