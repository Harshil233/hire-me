import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';

import { httpClient } from '@/services/api-client';
import { useAuthStore } from '@/store/auth.store';
import { renderWithProviders } from '@/test/render';
import { LoginForm } from '../components/LoginForm';

let mock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(httpClient);
  useAuthStore.setState({ accessToken: null, user: null, status: 'unknown' });
});

afterEach(() => {
  mock.restore();
});

const fillAndSubmit = async (email: string, password: string): Promise<void> => {
  await userEvent.type(screen.getByLabelText(/Email/), email);
  await userEvent.type(screen.getByLabelText(/Password/), password);
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
};

describe('LoginForm', () => {
  it('validates before sending anything to the server', async () => {
    renderWithProviders(<LoginForm role="candidate" onSuccess={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
  });

  it('rejects a malformed email', async () => {
    renderWithProviders(<LoginForm role="candidate" onSuccess={vi.fn()} />);

    await fillAndSubmit('not-an-email', 'anything');

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
  });

  it('signs in, stores the session and calls back', async () => {
    const onSuccess = vi.fn();
    mock.onPost('/candidate/login').reply(200, {
      success: true,
      data: {
        user: { id: 'user-1', email: 'ada@example.com', role: 'candidate' },
        accessToken: 'token-1',
      },
    });

    renderWithProviders(<LoginForm role="candidate" onSuccess={onSuccess} />);
    await fillAndSubmit('ada@example.com', 'Str0ng!pass');

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });
    expect(useAuthStore.getState().accessToken).toBe('token-1');
    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(mock.history.post[0]?.url).toBe('/candidate/login');
  });

  it('posts to the path of the role it was given', async () => {
    mock.onPost('/hr/login').reply(200, {
      success: true,
      data: {
        user: { id: 'user-2', email: 'grace@acme.test', role: 'hr' },
        accessToken: 'token-2',
      },
    });

    renderWithProviders(<LoginForm role="hr" onSuccess={vi.fn()} />);
    await fillAndSubmit('grace@acme.test', 'Str0ng!pass');

    await waitFor(() => {
      expect(useAuthStore.getState().user?.role).toBe('hr');
    });
    expect(mock.history.post[0]?.url).toBe('/hr/login');
  });

  it('shows the generic 401 when an account tries the other role’s path', async () => {
    mock.onPost('/hr/login').reply(401, {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect',
        details: [],
      },
    });

    renderWithProviders(<LoginForm role="hr" onSuccess={vi.fn()} />);
    await fillAndSubmit('ada@example.com', 'Str0ng!pass');

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect');
    expect(useAuthStore.getState().status).toBe('unknown');
  });

  it('shows a single generic banner for bad credentials', async () => {
    mock.onPost('/candidate/login').reply(401, {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect',
        details: [],
      },
    });

    renderWithProviders(<LoginForm role="candidate" onSuccess={vi.fn()} />);
    await fillAndSubmit('ada@example.com', 'Wr0ng!pass');

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect');
    expect(useAuthStore.getState().status).toBe('unknown');
  });

  it('surfaces a transport failure without losing what was typed', async () => {
    mock.onPost('/candidate/login').networkError();

    renderWithProviders(<LoginForm role="candidate" onSuccess={vi.fn()} />);
    await fillAndSubmit('ada@example.com', 'Str0ng!pass');

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i);
    expect(screen.getByLabelText(/Email/)).toHaveValue('ada@example.com');
  });

  it('maps a server field error back onto its input', async () => {
    mock.onPost('/candidate/login').reply(422, {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid',
        details: [{ field: 'email', message: 'This account was removed' }],
      },
    });

    renderWithProviders(<LoginForm role="candidate" onSuccess={vi.fn()} />);
    await fillAndSubmit('ada@example.com', 'Str0ng!pass');

    expect(await screen.findByText('This account was removed')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
