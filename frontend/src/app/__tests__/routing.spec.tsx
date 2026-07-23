import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';

import { ROUTES } from '@/config/constants';
import { httpClient } from '@/services/api-client';
import { useAuthStore } from '@/store/auth.store';
import {
  applicationListResponse,
  candidateProfileView,
  candidateUser,
  hrUser,
  jobListResponse,
} from '@/test/fixtures';
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

const allowRestore = (user = candidateUser): void => {
  const body = { success: true, data: { user, accessToken: 'token-1' } };
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

  it('sends a candidate from the root to the job list', async () => {
    allowRestore(candidateUser);
    mock.onGet('/jobs').reply(200, jobListResponse([]));

    renderWithProviders(<AppRoutes />, { route: ROUTES.ROOT });

    expect(await screen.findByRole('heading', { name: 'Open roles' })).toBeInTheDocument();
  });

  it('sends an employer from the root to the talent pool', async () => {
    allowRestore(hrUser);
    mock.onGet('/candidates').reply(200, { success: true, data: { candidates: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } } });

    renderWithProviders(<AppRoutes />, { route: ROUTES.ROOT });

    expect(await screen.findByRole('heading', { name: 'Find candidates' })).toBeInTheDocument();
  });

  it('renders a 404 for an unknown path', async () => {
    denyRestore();

    renderWithProviders(<AppRoutes />, { route: '/nowhere' });

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});

describe('role-scoped routes', () => {
  beforeEach(() => {
    mock.onGet('/jobs').reply(200, jobListResponse([]));
    mock.onGet('/jobs/mine').reply(200, jobListResponse([]));
  });

  it('lets an HR reach their postings', async () => {
    allowRestore(hrUser);

    renderWithProviders(<AppRoutes />, { route: ROUTES.HR_JOBS });

    expect(await screen.findByRole('heading', { name: 'Postings' })).toBeInTheDocument();
  });

  it('sends a candidate away from the HR-only postings screen', async () => {
    allowRestore(candidateUser);

    renderWithProviders(<AppRoutes />, { route: ROUTES.HR_JOBS });

    // Redirected to their own list rather than shown a screen the API would refuse.
    expect(await screen.findByRole('heading', { name: 'Open roles' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Postings' })).not.toBeInTheDocument();
  });

  it('sends an anonymous visitor to sign in', async () => {
    denyRestore();

    renderWithProviders(<AppRoutes />, { route: ROUTES.HR_JOBS });

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('opens the shared job browse screen to both roles', async () => {
    allowRestore(candidateUser);

    renderWithProviders(<AppRoutes />, { route: ROUTES.JOBS });

    expect(await screen.findByRole('heading', { name: 'Open roles' })).toBeInTheDocument();
  });

  it('shows the postings link in the nav only to HR', async () => {
    allowRestore(hrUser);

    renderWithProviders(<AppRoutes />, { route: ROUTES.JOBS });

    expect(within(await screen.findByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Postings' })).toBeInTheDocument();
  });

  it('hides the postings link from a candidate', async () => {
    allowRestore(candidateUser);

    renderWithProviders(<AppRoutes />, { route: ROUTES.JOBS });

    await screen.findByRole('heading', { name: 'Open roles' });
    expect(within(screen.getByRole('navigation', { name: 'Main' })).queryByRole('link', { name: 'Postings' })).not.toBeInTheDocument();
  });

  it('lets a candidate reach their applications', async () => {
    allowRestore(candidateUser);
    mock.onGet('/applications').reply(200, applicationListResponse([]));

    renderWithProviders(<AppRoutes />, { route: ROUTES.APPLICATIONS });

    expect(await screen.findByRole('heading', { name: 'Applications' })).toBeInTheDocument();
  });

  it('sends an employer away from the candidate-only applications screen', async () => {
    allowRestore(hrUser);

    mock.onGet('/candidates').reply(200, { success: true, data: { candidates: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } } });

    renderWithProviders(<AppRoutes />, { route: ROUTES.APPLICATIONS });

    expect(await screen.findByRole('heading', { name: 'Find candidates' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Applications' })).not.toBeInTheDocument();
  });

  it('sends a candidate away from the employer-only applicants screen', async () => {
    allowRestore(candidateUser);

    renderWithProviders(<AppRoutes />, { route: '/hr/jobs/job-1/applicants' });

    expect(await screen.findByRole('heading', { name: 'Open roles' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Applicants/ })).not.toBeInTheDocument();
  });

  it('shows the applications link in the nav only to a candidate', async () => {
    allowRestore(candidateUser);
    mock.onGet('/applications').reply(200, applicationListResponse([]));

    renderWithProviders(<AppRoutes />, { route: ROUTES.APPLICATIONS });

    expect(within(await screen.findByRole('navigation', { name: 'Main' })).getByRole('link', { name: 'Applications' })).toBeInTheDocument();
  });

  it('hides the applications link from an employer', async () => {
    allowRestore(hrUser);

    renderWithProviders(<AppRoutes />, { route: ROUTES.JOBS });

    await screen.findByRole('heading', { name: 'Open roles' });
    expect(within(screen.getByRole('navigation', { name: 'Main' })).queryByRole('link', { name: 'Applications' })).not.toBeInTheDocument();
  });

  it('offers the talent pool to an employer', async () => {
    allowRestore(hrUser);
    mock.onGet('/candidates').reply(200, { success: true, data: { candidates: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 } } });

    renderWithProviders(<AppRoutes />, { route: ROUTES.CANDIDATES });

    expect(await screen.findByRole('heading', { name: 'Find candidates' })).toBeInTheDocument();
  });

  it('sends a candidate away from the talent pool', async () => {
    allowRestore(candidateUser);
    mock.onGet('/jobs').reply(200, jobListResponse([]));

    renderWithProviders(<AppRoutes />, { route: ROUTES.CANDIDATES });

    expect(await screen.findByRole('heading', { name: 'Open roles' })).toBeInTheDocument();
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
