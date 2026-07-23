import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { Spinner } from '@/components/Spinner';
import { ROUTES, landingPathFor, type Role } from '@/config/constants';
import { useSession } from '@/features/auth/hooks/useSession';

const RestoringSession = (): React.JSX.Element => (
  <div className="flex min-h-screen items-center justify-center text-brand-text">
    <Spinner size="lg" label="Restoring your session" />
  </div>
);

/** Blocks a route until a session exists, remembering where the user was headed. */
export const ProtectedRoute = (): React.JSX.Element => {
  const { isRestoring, isAuthenticated } = useSession();
  const location = useLocation();

  if (isRestoring) {
    return <RestoringSession />;
  }

  return isAuthenticated ? (
    <Outlet />
  ) : (
    <Navigate to={ROUTES.LOGIN} replace state={{ from: location.pathname }} />
  );
};

export interface RoleRouteProps {
  readonly allow: Role;
}

/**
 * Restricts a branch of the router to one role. Sits inside `ProtectedRoute`, so by the
 * time it renders the session is settled. The server enforces the same rule — this only
 * spares the user a screen they would be refused anyway.
 */
export const RoleRoute = ({ allow }: RoleRouteProps): React.JSX.Element => {
  const { isRestoring, isAuthenticated, user } = useSession();

  if (isRestoring) {
    return <RestoringSession />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (user === null) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  // Sent to their own landing list rather than a screen the API would refuse.
  return user.role === allow ? <Outlet /> : <Navigate to={landingPathFor(user.role)} replace />;
};

/**
 * Keeps a signed-in user away from the sign-in and sign-up screens. Sends them to the
 * list their role came for — not to their profile, which is somewhere you go on purpose
 * rather than somewhere signing in should drop you.
 */
export const PublicOnlyRoute = (): React.JSX.Element => {
  const { isRestoring, isAuthenticated, user } = useSession();

  if (isRestoring) {
    return <RestoringSession />;
  }

  if (!isAuthenticated || user === null) {
    return <Outlet />;
  }

  return <Navigate to={landingPathFor(user.role)} replace />;
};
