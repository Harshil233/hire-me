import { Link, Outlet } from 'react-router-dom';

import { Button } from '@/components/Button';
import { ROUTES } from '@/config/constants';
import { useLogout } from '@/features/auth/hooks/useAuthActions';
import { useAuthStore } from '@/store/auth.store';

/** Shell for authenticated screens: brand bar, sign-out, page content. */
export const AppLayout = (): React.JSX.Element => {
  const logout = useLogout();
  const user = useAuthStore((state) => state.user);

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
          <Link to={ROUTES.PROFILE} className="text-lg font-bold tracking-tight text-brand-700">
            Hire Me
          </Link>

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
