import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';

import { httpClient } from '@/services/api-client';
import { useAuthStore } from '@/store/auth.store';
import { renderWithProviders } from '@/test/render';
import { CandidateRegisterForm } from '../components/CandidateRegisterForm';
import { HrRegisterForm } from '../components/HrRegisterForm';

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(httpClient);
  useAuthStore.setState({ accessToken: null, user: null, status: 'unknown' });
});

afterEach(() => {
  mock.restore();
});

const SESSION = {
  success: true,
  data: {
    user: { id: 'user-1', email: 'ada@example.com', role: 'candidate' },
    accessToken: 'token-1',
  },
};

describe('CandidateRegisterForm', () => {
  const fill = async (overrides: Partial<Record<string, string>> = {}): Promise<void> => {
    await userEvent.type(screen.getByLabelText(/First name/), overrides.firstName ?? 'Ada');
    await userEvent.type(screen.getByLabelText(/Last name/), overrides.lastName ?? 'Lovelace');
    await userEvent.type(screen.getByLabelText(/^Email/), overrides.email ?? 'ada@example.com');
    await userEvent.type(screen.getByLabelText(/^Password/), overrides.password ?? 'Str0ng!pass');
    await userEvent.type(
      screen.getByLabelText(/Confirm password/),
      overrides.confirmPassword ?? 'Str0ng!pass',
    );
  };

  it('blocks submission until the form is valid', async () => {
    renderWithProviders(<CandidateRegisterForm onSuccess={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /Create candidate account/ }));

    expect(await screen.findByText('First name is required')).toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
  });

  it('rejects a weak password with a specific reason', async () => {
    renderWithProviders(<CandidateRegisterForm onSuccess={vi.fn()} />);
    await fill({ password: 'weakpassword', confirmPassword: 'weakpassword' });
    await userEvent.click(screen.getByRole('button', { name: /Create candidate account/ }));

    expect(await screen.findByText('Add an uppercase letter')).toBeInTheDocument();
  });

  it('rejects mismatched passwords', async () => {
    renderWithProviders(<CandidateRegisterForm onSuccess={vi.fn()} />);
    await fill({ confirmPassword: 'Different1!' });
    await userEvent.click(screen.getByRole('button', { name: /Create candidate account/ }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
  });

  it('shows a live strength meter', async () => {
    renderWithProviders(<CandidateRegisterForm onSuccess={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/^Password/), 'abc');
    expect(await screen.findByText('Weak')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/^Password/), 'Defg1!hi');
    expect(await screen.findByText('Strong')).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    renderWithProviders(<CandidateRegisterForm onSuccess={vi.fn()} />);
    const input = screen.getByLabelText(/^Password/);

    expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getAllByRole('button', { name: 'Show' })[0]!);
    expect(input).toHaveAttribute('type', 'text');
  });

  it('registers and stores the session', async () => {
    const onSuccess = vi.fn();
    mock.onPost('/candidate/register').reply(201, SESSION);

    renderWithProviders(<CandidateRegisterForm onSuccess={onSuccess} />);
    await fill();
    await userEvent.click(screen.getByRole('button', { name: /Create candidate account/ }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });
    expect(useAuthStore.getState().accessToken).toBe('token-1');
  });

  it('reports a duplicate email on the email field', async () => {
    mock.onPost('/candidate/register').reply(409, {
      success: false,
      error: {
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'An account with this email already exists',
        details: [],
      },
    });

    renderWithProviders(<CandidateRegisterForm onSuccess={vi.fn()} />);
    await fill();
    await userEvent.click(screen.getByRole('button', { name: /Create candidate account/ }));

    expect(
      await screen.findByText('An account with this email already exists'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('HrRegisterForm', () => {
  const fill = async (): Promise<void> => {
    await userEvent.type(screen.getByLabelText(/First name/), 'Grace');
    await userEvent.type(screen.getByLabelText(/Last name/), 'Hopper');
    await userEvent.type(screen.getByLabelText(/Work email/), 'grace@acme.test');
    await userEvent.type(screen.getByLabelText(/^Password/), 'Str0ng!pass');
    await userEvent.type(screen.getByLabelText(/Confirm password/), 'Str0ng!pass');
    await userEvent.type(screen.getByLabelText(/Company name/), 'Acme Corp');
  };

  it('requires the company name', async () => {
    renderWithProviders(<HrRegisterForm onSuccess={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /Create employer account/ }));

    expect(await screen.findByText('Company name is required')).toBeInTheDocument();
  });

  it('sends the company nested inside the registration payload', async () => {
    mock.onPost('/hr/register').reply(201, {
      ...SESSION,
      data: { ...SESSION.data, user: { ...SESSION.data.user, role: 'hr' } },
    });

    renderWithProviders(<HrRegisterForm onSuccess={vi.fn()} />);
    await fill();
    await userEvent.click(screen.getByRole('button', { name: /Create employer account/ }));

    await waitFor(() => {
      expect(mock.history.post).toHaveLength(1);
    });
    expect(JSON.parse(mock.history.post[0]?.data as string)).toMatchObject({
      email: 'grace@acme.test',
      company: { name: 'Acme Corp' },
    });
  });

  it('maps a nested company error back onto its flat input', async () => {
    mock.onPost('/hr/register').reply(422, {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid',
        details: [{ field: 'company.domain', message: 'That domain is already registered' }],
      },
    });

    renderWithProviders(<HrRegisterForm onSuccess={vi.fn()} />);
    await fill();
    await userEvent.click(screen.getByRole('button', { name: /Create employer account/ }));

    expect(await screen.findByText('That domain is already registered')).toBeInTheDocument();
  });

  it('validates the optional company website before submitting', async () => {
    renderWithProviders(<HrRegisterForm onSuccess={vi.fn()} />);
    await fill();
    await userEvent.type(screen.getByLabelText(/Website/), 'not-a-url');
    await userEvent.click(screen.getByRole('button', { name: /Create employer account/ }));

    expect(await screen.findByText(/Enter a valid website/)).toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
  });
});
