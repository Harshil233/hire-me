import { Link, NavLink, Outlet } from 'react-router-dom';

import { Button } from '@/components/Button';
import { BriefcaseIcon, InboxIcon, LogoutIcon, UsersIcon } from '@/components/icons';
import { ROLES, ROUTES, landingPathFor } from '@/config/constants';
import { useLogout } from '@/features/auth/hooks/useAuthActions';
import { NavAvatar } from '@/features/profile/components/NavAvatar';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { ThemeToggle } from '@/features/theme/ThemeToggle';
import { useAuthStore } from '@/store/auth.store';

interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly icon: React.JSX.Element;
}

const navItemsFor = (role: string | undefined): readonly NavItem[] => {
  if (role === ROLES.HR) {
    return [
      { to: ROUTES.CANDIDATES, label: 'Candidates', icon: <UsersIcon className="h-4.5 w-4.5" /> },
      { to: ROUTES.HR_JOBS, label: 'Postings', icon: <BriefcaseIcon className="h-4.5 w-4.5" /> },
    ];
  }

  return [
    { to: ROUTES.JOBS, label: 'Jobs', icon: <BriefcaseIcon className="h-4.5 w-4.5" /> },
    {
      to: ROUTES.APPLICATIONS,
      label: 'Applications',
      icon: <InboxIcon className="h-4.5 w-4.5" />,
    },
  ];
};

/** Desktop nav renders as pills; the active one is filled rather than merely coloured. */
const deskLinkClasses = ({ isActive }: { isActive: boolean }): string =>
  [
    'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition',
    isActive
      ? 'bg-brand-soft text-brand-text'
      : 'text-fg-muted hover:bg-surface-hover hover:text-fg',
  ].join(' ');

/** On a phone the same items become a bottom bar, which is where thumbs are. */
const mobileLinkClasses = ({ isActive }: { isActive: boolean }): string =>
  [
    'flex flex-1 flex-col items-center gap-1 py-2 text-[0.6875rem] font-medium transition',
    isActive ? 'text-brand-text' : 'text-fg-subtle',
  ].join(' ');

export const AppLayout = (): React.JSX.Element => {
  const logout = useLogout();
  const user = useAuthStore((state) => state.user);
  const navItems = navItemsFor(user?.role);
  const home = user === null ? ROUTES.JOBS : landingPathFor(user.role);

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-7">
            <Link
              to={home}
              className="inline-flex items-center gap-2.5 text-base font-bold tracking-tight text-fg"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-fg-on-brand">
                <BriefcaseIcon className="h-4.5 w-4.5" />
              </span>
              <span className="hidden sm:inline">Hire&nbsp;Me</span>
            </Link>

            <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={deskLinkClasses}>
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
              <NavLink to={ROUTES.PROFILE} className={deskLinkClasses}>
                Profile
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell isEnabled={user !== null} />
            <ThemeToggle />

            {user !== null && (
              <Link
                to={ROUTES.PROFILE}
                title={user.email}
                className="hidden transition hover:brightness-95 sm:block"
              >
                <NavAvatar email={user.email} className="h-9 w-9 text-xs" />
              </Link>
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

      {/* Bottom padding clears the mobile tab bar so nothing sits under it. */}
      <main className="mx-auto max-w-6xl px-4 pt-5 pb-24 sm:px-6 sm:pt-6 md:pb-10">
        <Outlet />
      </main>

      {/* The same destinations as a bottom bar on phones. Distinctly labelled, because
          two navigation landmarks sharing a name is ambiguous to a screen reader. */}
      <nav
        aria-label="Bottom"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface/95 backdrop-blur-xl md:hidden"
      >
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} className={mobileLinkClasses}>
            {item.icon}
            {item.label}
          </NavLink>
        ))}
        <NavLink to={ROUTES.PROFILE} className={mobileLinkClasses}>
          {user === null ? (
            <span className="h-4.5 w-4.5" />
          ) : (
            <NavAvatar email={user.email} className="h-4.5 w-4.5 text-[0.5rem]" />
          )}
          Profile
        </NavLink>
      </nav>
    </div>
  );
};
