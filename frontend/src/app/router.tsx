import { Navigate, Route, Routes } from 'react-router-dom';

import { ROLES, ROUTES } from '@/config/constants';
import { HrJobsPage } from '@/pages/HrJobsPage';
import { JobDetailPage } from '@/pages/JobDetailPage';
import { JobsPage } from '@/pages/JobsPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RegisterPage } from '@/pages/RegisterPage';
import { AppLayout } from './AppLayout';
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from './guards';

export const AppRoutes = (): React.JSX.Element => (
  <Routes>
    <Route element={<PublicOnlyRoute />}>
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
    </Route>

    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
        <Route path={ROUTES.JOBS} element={<JobsPage />} />
        <Route path={ROUTES.JOB_DETAIL} element={<JobDetailPage />} />

        {/* Posting is HR-only; the API enforces the same rule independently. */}
        <Route element={<RoleRoute allow={ROLES.HR} />}>
          <Route path={ROUTES.HR_JOBS} element={<HrJobsPage />} />
        </Route>
      </Route>
    </Route>

    <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.PROFILE} replace />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
