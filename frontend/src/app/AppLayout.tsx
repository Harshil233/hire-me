import { Link, NavLink, Outlet } from 'react-router-dom';

import { Button } from '@/components/Button';
import { ROLES, ROUTES } from '@/config/constants';
import { useLogout } from '@/features/auth/hooks/useAuthActions';
import { useAuthStore } from '@/store/auth.store';

const linkClasses = ({ isActive }: { isActive: boolean }): string =>
  isActive
    ? 'text-sm font-medium text-brand-700'
    : 'text-sm font-medium text-slate-500 transition hover:text-slate-800';

/** Shell for authenticated screens: brand bar, role-aware nav, sign-out, page content. */
export const AppLayout = (): React.JSX.Element => {
  const logout = useLogout();
  const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3.5">
          <div className="flex items-center gap-6">
            <Link to={ROUTES.PROFILE} className="text-lg font-bold tracking-tight text-brand-700">
              Hire Me
            </Link>

            <nav aria-label="Main" className="flex items-center gap-4">
              <NavLink to={ROUTES.PROFILE} className={linkClasses}>
                Profile
              </NavLink>
              <NavLink to={ROUTES.JOBS} className={linkClasses}>
                Jobs
              </NavLink>
              {user?.role === ROLES.HR && (
                <NavLink to={ROUTES.HR_JOBS} className={linkClasses}>
                  My postings
                </NavLink>
              )}
              {user?.role === ROLES.CANDIDATE && (
                <NavLink to={ROUTES.APPLICATIONS} className={linkClasses}>
                  My applications
                </NavLink>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user !== null && (
              <span className="hidden text-sm text-slate-500 sm:inline">{user.email}</span>
            )}
            <Button
              size="sm"
              variant="secondary"
              isLoading={logout.isPending}
              onClick={() => {
                logout.mutate();
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
};
