import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { ROLES, ROUTES, type Role } from '@/config/constants';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { RoleTabs } from '@/features/auth/components/RoleTabs';
import { AuthLayout } from './AuthLayout';

interface RedirectState {
  readonly from?: string;
}

export const LoginPage = (): React.JSX.Element => {
  const [role, setRole] = useState<Role>(ROLES.CANDIDATE);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as RedirectState | null;

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your profile."
      footer={
        <p className="text-sm text-fg-muted">
          New here?{' '}
          <Link to={ROUTES.REGISTER} className="font-medium text-brand-text hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
      <RoleTabs value={role} onChange={setRole} label="Account type" />

      {/* Keyed by role so switching tabs starts a clean attempt, as sign-up already does. */}
      <LoginForm
        key={role}
        role={role}
        onSuccess={() => {
          void navigate(state?.from ?? ROUTES.PROFILE, { replace: true });
        }}
      />
    </AuthLayout>
  );
};
