import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ROLES, ROUTES, type Role } from '@/config/constants';
import { CandidateRegisterForm } from '@/features/auth/components/CandidateRegisterForm';
import { HrRegisterForm } from '@/features/auth/components/HrRegisterForm';
import { RoleTabs } from '@/features/auth/components/RoleTabs';
import { AuthLayout } from './AuthLayout';

export const RegisterPage = (): React.JSX.Element => {
  const [role, setRole] = useState<Role>(ROLES.CANDIDATE);
  const navigate = useNavigate();

  const goToProfile = (): void => {
    void navigate(ROUTES.PROFILE, { replace: true });
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start with the essentials — you can complete your profile next."
      wide={role === ROLES.HR}
      footer={
        <p className="text-sm text-slate-600">
          Already have an account?{' '}
          <Link to={ROUTES.LOGIN} className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <RoleTabs value={role} onChange={setRole} label="Account type" />

      {role === ROLES.CANDIDATE ? (
        <CandidateRegisterForm onSuccess={goToProfile} />
      ) : (
        <HrRegisterForm onSuccess={goToProfile} />
      )}
    </AuthLayout>
  );
};
