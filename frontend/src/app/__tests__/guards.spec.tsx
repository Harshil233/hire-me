import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';

import { ROLES, ROUTES } from '@/config/constants';
import { useAuthStore } from '@/store/auth.store';
import { candidateUser, hrUser } from '@/test/fixtures';
import { renderWithProviders } from '@/test/render';
import { RoleRoute } from '../guards';

/**
 * `RoleRoute` is exported on its own, so its restoring and unauthenticated branches are
 * exercised here directly. In the live router it sits inside `ProtectedRoute`, which
 * settles the session first — these cases only fire if it is mounted standalone.
 */
const renderGuard = (allow: typeof ROLES.HR | typeof ROLES.CANDIDATE): void => {
  renderWithProviders(
    <Routes>
      <Route element={<RoleRoute allow={allow} />}>
        <Route path="/guarded" element={<h1>Guarded content</h1>} />
      </Route>
      <Route path={ROUTES.PROFILE} element={<h1>Profile</h1>} />
      <Route path={ROUTES.LOGIN} element={<h1>Sign in</h1>} />
    </Routes>,
    { route: '/guarded' },
  );
};

describe('RoleRoute', () => {
  it('renders the branch for a matching role', () => {
    useAuthStore.setState({ user: hrUser, accessToken: 'token', status: 'authenticated' });

    renderGuard(ROLES.HR);

    expect(screen.getByRole('heading', { name: 'Guarded content' })).toBeInTheDocument();
  });

  it('redirects a signed-in user whose role does not match', () => {
    useAuthStore.setState({ user: candidateUser, accessToken: 'token', status: 'authenticated' });

    renderGuard(ROLES.HR);

    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
  });

  it('waits while the session is still being restored', () => {
    useAuthStore.setState({ user: null, accessToken: null, status: 'unknown' });

    renderGuard(ROLES.HR);

    expect(screen.getByRole('status', { name: 'Restoring your session' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Guarded content' })).not.toBeInTheDocument();
  });

  it('sends an anonymous visitor to sign in', () => {
    useAuthStore.setState({ user: null, accessToken: null, status: 'anonymous' });

    renderGuard(ROLES.HR);

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});
