import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import MockAdapter from 'axios-mock-adapter';

import { httpClient } from '@/services/api-client';
import { useAuthStore } from '@/store/auth.store';
import {
  candidateProfileView,
  company,
  candidateUser,
  hrProfileView,
  hrUser,
} from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';
import { ProfilePage } from '@/pages/ProfilePage';

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(httpClient);
  // Section lists are requested by the candidate view; default them to empty.
  mock.onGet(/\/(experience|education|project|certification)$/).reply(200, {
    success: true,
    data: { experiences: [], educations: [], projects: [], certifications: [] },
  });
  mock.onGet(/\/files\//).reply(200, new Blob(['x']));
});

afterEach(() => {
  mock.restore();
  useAuthStore.setState({ accessToken: null, user: null, status: 'unknown' });
});

const signIn = (user: typeof candidateUser): void => {
  useAuthStore.getState().setSession(user, 'token-1');
};

describe('ProfilePage — loading and failure', () => {
  it('shows a spinner while the profile loads', () => {
    signIn(candidateUser);
    mock.onGet('/profile').reply(() => new Promise(() => undefined));

    renderWithProviders(<ProfilePage />);

    expect(screen.getByRole('status', { name: 'Loading your profile' })).toBeInTheDocument();
  });

  it('shows the server message when the profile cannot be loaded', async () => {
    signIn(candidateUser);
    mock.onGet('/profile').reply(404, {
      success: false,
      error: { code: 'PROFILE_NOT_FOUND', message: 'Candidate profile not found', details: [] },
    });

    renderWithProviders(<ProfilePage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Candidate profile not found');
  });
});

describe('ProfilePage — candidate', () => {
  beforeEach(() => {
    signIn(candidateUser);
    mock.onGet('/profile').reply(200, { success: true, data: candidateProfileView });
  });

  it('renders the identity, completion and every section', async () => {
    renderWithProviders(<ProfilePage />);

    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Profile 10% complete' })).toBeInTheDocument();

    for (const title of [
      'Personal details',
      'Skills and preferences',
      'Resume',
      'Work experience',
      'Education',
      'Projects',
      'Certifications',
    ]) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
  });

  it('links each missing item to its section', async () => {
    renderWithProviders(<ProfilePage />);

    const link = await screen.findByRole('link', { name: '+ resume' });
    expect(link).toHaveAttribute('href', '#section-resume');
  });

  it('falls back to initials when there is no photo', async () => {
    renderWithProviders(<ProfilePage />);

    expect(await screen.findByText('AL')).toBeInTheDocument();
  });

  it('saves personal details and reflects the new completion', async () => {
    mock.onPut('/profile').reply(200, {
      success: true,
      data: {
        ...candidateProfileView,
        profile: { ...candidateProfileView.profile, currentLocation: 'Pune' },
        completion: { ...candidateProfileView.completion, percentage: 15, missing: [] },
      },
    });

    renderWithProviders(<ProfilePage />);

    await userEvent.type(await screen.findByLabelText('Current location'), 'Pune');
    await userEvent.click(screen.getAllByRole('button', { name: 'Save changes' })[0]!);

    await waitFor(() => {
      expect(mock.history.put).toHaveLength(1);
    });
    expect(JSON.parse(mock.history.put[0]?.data as string)).toMatchObject({
      currentLocation: 'Pune',
    });
    expect(await screen.findByRole('img', { name: 'Profile 15% complete' })).toBeInTheDocument();
  });

  it('validates on the client before calling the API', async () => {
    renderWithProviders(<ProfilePage />);

    const firstName = await screen.findByLabelText(/First name/);
    await userEvent.clear(firstName);
    await userEvent.click(screen.getAllByRole('button', { name: 'Save changes' })[0]!);

    expect(await screen.findByText('First name is required')).toBeInTheDocument();
    expect(mock.history.put).toHaveLength(0);
  });

  it('requires the country code alongside a mobile number', async () => {
    renderWithProviders(<ProfilePage />);

    await userEvent.type(await screen.findByLabelText('Mobile number'), '9876543210');
    await userEvent.click(screen.getAllByRole('button', { name: 'Save changes' })[0]!);

    expect(await screen.findByText('Add the country code')).toBeInTheDocument();
    expect(mock.history.put).toHaveLength(0);
  });

  it('keeps the save button disabled until something changes', async () => {
    renderWithProviders(<ProfilePage />);

    const buttons = await screen.findAllByRole('button', { name: 'Save changes' });
    expect(buttons[0]).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Current location'), 'P');
    expect(buttons[0]).toBeEnabled();
  });

  it('adds a skill through the chips control', async () => {
    renderWithProviders(<ProfilePage />);

    const skills = await screen.findByLabelText('Skills');
    await userEvent.type(skills, 'TypeScript{Enter}');

    expect(screen.getByRole('button', { name: 'Remove TypeScript' })).toBeInTheDocument();
  });

  it('prompts for a resume when none is attached', async () => {
    renderWithProviders(<ProfilePage />);

    expect(await screen.findByText('No resume uploaded yet')).toBeInTheDocument();
  });
});

describe('ProfilePage — HR', () => {
  beforeEach(() => {
    signIn(hrUser);
    mock.onGet('/profile').reply(200, { success: true, data: hrProfileView });
  });

  it('renders the HR identity and company card', async () => {
    renderWithProviders(<ProfilePage />);

    expect(await screen.findByRole('heading', { name: 'Grace Hopper' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Company' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Company name/)).toHaveValue('Acme Corp');
  });

  it('does not render candidate-only sections', async () => {
    renderWithProviders(<ProfilePage />);

    await screen.findByRole('heading', { name: 'Company' });
    expect(screen.queryByRole('heading', { name: 'Work experience' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Resume' })).not.toBeInTheDocument();
  });

  it('saves company details to the company endpoint', async () => {
    mock.onPut('/company/company-1').reply(200, {
      success: true,
      data: { company: { ...company, description: 'We build things' } },
    });

    renderWithProviders(<ProfilePage />);

    await userEvent.type(await screen.findByLabelText('About the company'), 'We build things');
    const companyCard = screen.getByRole('heading', { name: 'Company' }).closest('section')!;
    await userEvent.click(within(companyCard).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(mock.history.put).toHaveLength(1);
    });
    expect(mock.history.put[0]?.url).toBe('/company/company-1');
  });

  it('validates a company social link before sending it', async () => {
    renderWithProviders(<ProfilePage />);

    await userEvent.type(await screen.findByLabelText('LinkedIn'), 'https://evil.test/acme');
    const companyCard = screen.getByRole('heading', { name: 'Company' }).closest('section')!;
    await userEvent.click(within(companyCard).getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText(/Enter a valid LinkedIn/)).toBeInTheDocument();
    expect(mock.history.put).toHaveLength(0);
  });

  it('tells a non-owner they cannot edit', async () => {
    mock.onGet('/profile').reply(200, {
      success: true,
      data: {
        ...hrProfileView,
        profile: { ...hrProfileView.profile, companyRole: 'member' },
      },
    });

    renderWithProviders(<ProfilePage />);

    expect(
      await screen.findByText('Only a company owner can edit these details.'),
    ).toBeInTheDocument();
  });

  it('warns when no company is linked', async () => {
    mock.onGet('/profile').reply(200, {
      success: true,
      data: { ...hrProfileView, profile: { ...hrProfileView.profile, company: null } },
    });

    renderWithProviders(<ProfilePage />);

    expect(await screen.findByText('No company linked')).toBeInTheDocument();
  });
});
