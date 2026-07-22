import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { Modal } from '@/components/Modal';
import { ApiError } from '@/services/api-error';
import { useAuthStore } from '@/store/auth.store';
import { httpClient } from '@/services/api-client';
import {
  candidateProfileView,
  candidateUser,
  company,
  hrProfileView,
  hrUser,
} from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';
import { ProfilePage } from '@/pages/ProfilePage';
import { createSectionApi } from '@/features/sections/api/section.api';
import { certificationConfig } from '@/features/sections/configs/certification.config';
import { educationConfig } from '@/features/sections/configs/education.config';
import { projectConfig } from '@/features/sections/configs/project.config';
import {
  companyFormSchema,
  hrPersonalFormSchema,
  jobPreferencesFormSchema,
} from '@/features/profile/schemas/profile.schema';

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(httpClient);
  mock.onGet(/\/(experience|education|project|certification)$/).reply(200, {
    success: true,
    data: { experiences: [], educations: [], projects: [], certifications: [] },
  });
});

afterEach(() => {
  mock.restore();
  useAuthStore.setState({ accessToken: null, user: null, status: 'unknown' });
});

describe('Modal focus trap', () => {
  it('cycles focus forwards and backwards inside the dialog', async () => {
    render(
      <Modal isOpen title="Trap" onClose={vi.fn()} footer={<button>Last</button>}>
        <button>First</button>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog');
    const last = within(dialog).getByRole('button', { name: 'Last' });

    last.focus();
    await userEvent.tab();
    expect(document.activeElement).not.toBe(last);

    const first = within(dialog).getByRole('button', { name: 'Close' });
    first.focus();
    await userEvent.tab({ shift: true });
    expect(document.activeElement).not.toBe(first);
  });

  it('tolerates a dialog with nothing focusable', async () => {
    render(
      <Modal isOpen title="Empty" onClose={vi.fn()}>
        <span>Nothing here</span>
      </Modal>,
    );

    await userEvent.tab();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('cross-field profile rules', () => {
  const baseHr = {
    firstName: 'Grace',
    middleName: '',
    lastName: 'Hopper',
    designation: '',
    gender: '' as const,
    dob: '',
    countryCode: '',
    mobileNumber: '',
  };

  it('requires the mobile number when a country code is given', () => {
    const result = hrPersonalFormSchema.safeParse({ ...baseHr, countryCode: '+91' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['mobileNumber']);
  });

  it('accepts a complete pair or neither half', () => {
    expect(hrPersonalFormSchema.safeParse(baseHr).success).toBe(true);
    expect(
      hrPersonalFormSchema.safeParse({
        ...baseHr,
        countryCode: '+91',
        mobileNumber: '9876543210',
      }).success,
    ).toBe(true);
  });

  it('flags an expected salary below the current one', () => {
    const result = jobPreferencesFormSchema.safeParse({
      preferredLocations: [],
      skills: [],
      jobTypes: [],
      currentCtc: '1800000',
      expectedCtc: '1200000',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['expectedCtc']);
  });

  it('accepts an expected salary at or above the current one', () => {
    expect(
      jobPreferencesFormSchema.safeParse({
        preferredLocations: [],
        skills: [],
        jobTypes: [],
        currentCtc: '1200000',
        expectedCtc: '1800000',
      }).success,
    ).toBe(true);
  });

  it('validates every company social link independently', () => {
    const base = {
      name: 'Acme',
      description: '',
      headquarters: '',
      locations: [],
      domain: '',
      websiteUrl: '',
      linkedinUrl: '',
      facebookUrl: '',
      instagramUrl: '',
      googleMapsLink: '',
      address: '',
    };

    expect(companyFormSchema.safeParse(base).success).toBe(true);
    expect(companyFormSchema.safeParse({ ...base, facebookUrl: 'https://x.test' }).success).toBe(
      false,
    );
    expect(companyFormSchema.safeParse({ ...base, instagramUrl: 'https://x.test' }).success).toBe(
      false,
    );
    expect(companyFormSchema.safeParse({ ...base, googleMapsLink: 'https://x.test' }).success).toBe(
      false,
    );
    expect(
      companyFormSchema.safeParse({
        ...base,
        facebookUrl: 'https://facebook.com/acme',
        instagramUrl: 'https://instagram.com/acme',
        googleMapsLink: 'https://maps.app.goo.gl/abc',
      }).success,
    ).toBe(true);
  });
});

describe('section API contract failures', () => {
  const client = axios.create({ baseURL: 'http://api.test/api/v1' });
  let apiMock: MockAdapter;

  beforeEach(() => {
    apiMock = new MockAdapter(client);
  });

  afterEach(() => {
    apiMock.restore();
  });

  const api = (): ReturnType<typeof createSectionApi<{ id: string }>> =>
    createSectionApi<{ id: string }>(
      {
        resourcePath: '/experience',
        pluralKey: 'experiences',
        singularKey: 'experience',
        itemSchema: z.object({ id: z.string() }),
      },
      client,
    );

  it('returns an empty list when the envelope key is missing', async () => {
    apiMock.onGet('/experience').reply(200, { success: true, data: {} });

    await expect(api().list()).resolves.toEqual([]);
  });

  it('rejects a create response missing its record', async () => {
    apiMock.onPost('/experience').reply(201, { success: true, data: {} });

    await expect(api().create({})).rejects.toBeInstanceOf(ApiError);
  });

  it('deletes without expecting a body', async () => {
    apiMock.onDelete('/experience/exp-1').reply(204);

    await expect(api().remove('exp-1')).resolves.toBeUndefined();
  });
});

describe('job type selection', () => {
  beforeEach(() => {
    useAuthStore.getState().setSession(candidateUser, 'token-1');
    mock.onGet('/profile').reply(200, {
      success: true,
      data: {
        ...candidateProfileView,
        profile: { ...candidateProfileView.profile, jobTypes: ['full_time'] },
      },
    });
    mock.onGet(/\/files\//).reply(200, new Blob(['x']));
  });

  it('toggles a job type on and off', async () => {
    renderWithProviders(<ProfilePage />);

    const fullTime = await screen.findByRole('button', { name: 'Full time' });
    expect(fullTime).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(fullTime);
    expect(fullTime).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(screen.getByRole('button', { name: 'Contract' }));
    expect(screen.getByRole('button', { name: 'Contract' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('confirms a successful save and then disables the button again', async () => {
    mock.onPut('/profile').reply(200, { success: true, data: candidateProfileView });

    renderWithProviders(<ProfilePage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Contract' }));
    const saveButtons = screen.getAllByRole('button', { name: 'Save changes' });
    await userEvent.click(saveButtons[1]!);

    await waitFor(() => {
      expect(mock.history.put).toHaveLength(1);
    });
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });
});

describe('company card upload and failure paths', () => {
  beforeEach(() => {
    useAuthStore.getState().setSession(hrUser, 'token-1');
    mock.onGet('/profile').reply(200, { success: true, data: hrProfileView });
    mock.onGet(/\/files\//).reply(200, new Blob(['x']));
  });

  it('uploads a logo and saves it with the rest of the company', async () => {
    mock.onPost('/files').reply(201, {
      success: true,
      data: {
        file: {
          id: 'logo-1',
          kind: 'company_logo',
          originalName: 'logo.png',
          mimeType: 'image/png',
          sizeBytes: 512,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      },
    });
    mock.onPut('/company/company-1').reply(200, {
      success: true,
      data: { company: { ...company, logoFileId: 'logo-1' } },
    });

    renderWithProviders(<ProfilePage />);

    await userEvent.upload(
      await screen.findByLabelText('Add logo'),
      new File(['x'], 'logo.png', { type: 'image/png' }),
    );

    await waitFor(() => {
      expect(mock.history.put).toHaveLength(1);
    });
    expect(JSON.parse(mock.history.put[0]?.data as string)).toMatchObject({
      logoFileId: 'logo-1',
    });
  });

  it('shows a permission failure returned by the server', async () => {
    mock.onPut('/company/company-1').reply(403, {
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Only a company owner can update these details',
        details: [],
      },
    });

    renderWithProviders(<ProfilePage />);

    await userEvent.type(await screen.findByLabelText('About the company'), 'Hello');
    const companyCard = screen.getByRole('heading', { name: 'Company' }).closest('section')!;
    await userEvent.click(within(companyCard).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Only a company owner');
  });
});

describe('section presenters without optional data', () => {
  it('omits absent fields', () => {
    const education = educationConfig.present({
      id: 'edu-1',
      college: 'IIT',
      course: 'CS',
      degree: 'B.Tech',
      startDate: '2016-07-01T00:00:00.000Z',
      isCurrent: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(education.description).toBeUndefined();

    const project = projectConfig.present({
      id: 'proj-1',
      title: 'Portal',
      skills: [],
      startDate: '2024-01-01T00:00:00.000Z',
      isCurrent: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(project.subtitle).toBeUndefined();
    expect(project.link).toBeUndefined();

    const certification = certificationConfig.present({
      id: 'cert-1',
      title: 'AWS',
      issuedBy: 'Amazon',
      issuedOn: '2023-05-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(certification.link).toBeUndefined();
  });

  it('maps optional values back into blank form controls', () => {
    const values = projectConfig.toValues({
      id: 'proj-1',
      title: 'Portal',
      skills: [],
      startDate: '2024-01-01T00:00:00.000Z',
      isCurrent: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(values.domain).toBe('');
    expect(values.link).toBe('');
    expect(values.endDate).toBe('');
  });

  it('omits blank optional values from the payload', () => {
    const payload = certificationConfig.toPayload({
      title: 'AWS',
      issuedBy: 'Amazon',
      issuedOn: '2023-05-01',
      expiresOn: '',
      credentialUrl: '',
      description: '',
    });

    expect(payload.expiresOn).toBeUndefined();
    expect(payload.credentialUrl).toBeUndefined();
  });
});
