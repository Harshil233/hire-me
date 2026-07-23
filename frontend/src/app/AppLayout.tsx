import { Link, NavLink, Outlet } from 'react-router-dom';

import { Button } from '@/components/Button';
import { BriefcaseIcon, LogoutIcon } from '@/components/icons';
import { ROLES, ROUTES } from '@/config/constants';
import { useLogout } from '@/features/auth/hooks/useAuthActions';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { ThemeToggle } from '@/features/theme/ThemeToggle';
import { useAuthStore } from '@/store/auth.store';

/** Nav items render as pills, with the active one filled rather than merely coloured. */
const linkClasses = ({ isActive }: { isActive: boolean }): string =>
  [
    'rounded-full px-3.5 py-1.5 text-sm font-medium transition',
    isActive
      ? 'bg-brand-soft text-brand-text'
      : 'text-fg-muted hover:bg-surface-hover hover:text-fg',
  ].join(' ');

const initialsOf = (email: string): string => email.slice(0, 2).toUpperCase();

/** Shell for authenticated screens: sticky brand bar, role-aware nav, page content. */
export const AppLayout = (): React.JSX.Element => {
  const logout = useLogout();
  const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <Link
              to={ROUTES.JOBS}
              className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight text-fg"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-fg-on-brand">
                <BriefcaseIcon className="h-4.5 w-4.5" />
              </span>
              <span className="hidden sm:inline">Hire&nbsp;Me</span>
            </Link>

            <nav aria-label="Main" className="flex items-center gap-1">
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
              <NavLink to={ROUTES.PROFILE} className={linkClasses}>
                Profile
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell isEnabled={user !== null} />
            <ThemeToggle />

            {user !== null && (
              <span
                title={user.email}
                aria-hidden="true"
                className="hidden h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-text sm:flex"
              >
                {initialsOf(user.email)}
              </span>
            )}

            <Button
              size="sm"
              variant="ghost"
              isLoading={logout.isPending}
              leadingIcon={<LogoutIcon className="h-4 w-4" />}
              onClick={() => {
                logout.mutate();
              }}
            >
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-9">
        <Outlet />
      </main>
    </div>
  );
};
