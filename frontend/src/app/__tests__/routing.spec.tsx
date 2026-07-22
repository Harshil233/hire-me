import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';

import { ROUTES } from '@/config/constants';
import { httpClient } from '@/services/api-client';
import { useAuthStore } from '@/store/auth.store';
import { candidateProfileView, candidateUser } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';
import { AppRoutes } from '../router';

let mock: MockAdapter;
let bareAxiosMock: MockAdapter;

beforeEach(() => {
  mock = new MockAdapter(httpClient);
  // `useSession` restores through the bare axios instance, matching the interceptor.
  bareAxiosMock = new MockAdapter(axios);
  mock.onGet('/profile').reply(200, { success: true, data: candidateProfileView });
  mock.onGet(/\/(experience|education|project|certification)$/).reply(200, {
    success: true,
    data: { experiences: [], educations: [], projects: [], certifications: [] },
  });
  useAuthStore.setState({ accessToken: null, user: null, status: 'unknown' });
});

afterEach(() => {
  mock.restore();
  bareAxiosMock.restore();
});

// `useSession` refreshes through the shared client; the interceptor's own retry uses
// the bare axios instance. Both are stubbed so no request escapes the test.
const denyRestore = (): void => {
  const body = {
    success: false,
    error: { code: 'REFRESH_TOKEN_INVALID', message: 'expired', details: [] },
  };
  mock.onPost('/refresh').reply(401, body);
  bareAxiosMock.onPost(/\/refresh$/).reply(401, body);
};

const allowRestore = (): void => {
  const body = { success: true, data: { user: candidateUser, accessToken: 'token-1' } };
  mock.onPost('/refresh').reply(200, body);
  bareAxiosMock.onPost(/\/refresh$/).reply(200, body);
};

describe('session restore', () => {
  it('shows a restoring state, then the sign-in screen when there is no cookie', async () => {
    denyRestore();

    renderWithProviders(<AppRoutes />, { route: ROUTES.PROFILE });

    expect(screen.getByRole('status', { name: 'Restoring your session' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('restores the session from the refresh cookie and lands on the profile', async () => {
    allowRestore();

    renderWithProviders(<AppRoutes />, { route: ROUTES.PROFILE });

    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(useAuthStore.getState().accessToken).toBe('token-1');
  });
});

describe('route guards', () => {
  it('keeps an anonymous visitor away from the profile', async () => {
    denyRestore();

    renderWithProviders(<AppRoutes />, { route: ROUTES.PROFILE });

    await screen.findByRole('heading', { name: 'Welcome back' });
    expect(screen.queryByRole('heading', { name: 'Ada Lovelace' })).not.toBeInTheDocument();
  });

  it('keeps a signed-in user away from the sign-in screen', async () => {
    allowRestore();

    renderWithProviders(<AppRoutes />, { route: ROUTES.LOGIN });

    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
  });

  it('sends the root path to the profile', async () => {
    allowRestore();

    renderWithProviders(<AppRoutes />, { route: ROUTES.ROOT });

    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
  });

  it('renders a 404 for an unknown path', async () => {
    denyRestore();

    renderWithProviders(<AppRoutes />, { route: '/nowhere' });

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});

describe('sign-in screen', () => {
  beforeEach(() => {
    denyRestore();
  });

  it('offers both account types and starts on candidate', async () => {
    renderWithProviders(<AppRoutes />, { route: ROUTES.LOGIN });

    await screen.findByRole('heading', { name: 'Welcome back' });
    expect(screen.getByRole('tab', { name: /looking for a job/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: /hiring/ })).toHaveAttribute('aria-selected', 'false');
  });

  it.each([
    ['looking for a job', '/candidate/login'],
    ['hiring', '/hr/login'],
  ])('sends the "%s" tab to %s', async (tabName, expectedPath) => {
    mock.onPost(expectedPath).reply(401, {
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect', details: [] },
    });

    renderWithProviders(<AppRoutes />, { route: ROUTES.LOGIN });

    await screen.findByRole('heading', { name: 'Welcome back' });
    await userEvent.click(screen.getByRole('tab', { name: new RegExp(tabName) }));
    await userEvent.type(screen.getByLabelText(/Email/), 'ada@example.com');
    await userEvent.type(screen.getByLabelText(/Password/), 'Str0ng!pass');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mock.history.post.some((call) => call.url === expectedPath)).toBe(true);
    });
  });

  it('clears a failed attempt when the account type is switched', async () => {
    mock.onPost('/candidate/login').reply(401, {
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect', details: [] },
    });

    renderWithProviders(<AppRoutes />, { route: ROUTES.LOGIN });

    await screen.findByRole('heading', { name: 'Welcome back' });
    await userEvent.type(screen.getByLabelText(/Email/), 'grace@acme.test');
    await userEvent.type(screen.getByLabelText(/Password/), 'Str0ng!pass');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect');

    await userEvent.click(screen.getByRole('tab', { name: /hiring/ }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('sign-up screen', () => {
  beforeEach(() => {
    denyRestore();
  });

  it('offers both account types and starts on candidate', async () => {
    renderWithProviders(<AppRoutes />, { route: ROUTES.REGISTER });

    expect(
      await screen.findByRole('button', { name: /Create candidate account/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /looking for a job/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('switches to the employer form', async () => {
    renderWithProviders(<AppRoutes />, { route: ROUTES.REGISTER });

    await userEvent.click(await screen.findByRole('tab', { name: /hiring/ }));

    expect(screen.getByRole('button', { name: /Create employer account/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/Company name/)).toBeInTheDocument();
  });

  it('links back to sign in', async () => {
    renderWithProviders(<AppRoutes />, { route: ROUTES.REGISTER });

    await userEvent.click(await screen.findByRole('link', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });
});

describe('signed-in shell', () => {
  it('signs the user out and returns to the sign-in screen', async () => {
    allowRestore();
    mock.onPost('/logout').reply(200, { success: true, data: { loggedOut: true } });

    renderWithProviders(<AppRoutes />, { route: ROUTES.PROFILE });

    await screen.findByRole('heading', { name: 'Ada Lovelace' });
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(useAuthStore.getState().status).toBe('anonymous');
    });
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('shows the signed-in email in the header', async () => {
    allowRestore();

    renderWithProviders(<AppRoutes />, { route: ROUTES.PROFILE });

    await screen.findByRole('heading', { name: 'Ada Lovelace' });
    expect(screen.getAllByText('ada@example.com').length).toBeGreaterThan(0);
  });
});
