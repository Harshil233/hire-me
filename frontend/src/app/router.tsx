import { Navigate, Route, Routes } from 'react-router-dom';

import { ROLES, ROUTES } from '@/config/constants';
import { HrJobsPage } from '@/pages/HrJobsPage';
import { JobApplicantsPage } from '@/pages/JobApplicantsPage';
import { JobDetailPage } from '@/pages/JobDetailPage';
import { JobsPage } from '@/pages/JobsPage';
import { LoginPage } from '@/pages/LoginPage';
import { MyApplicationsPage } from '@/pages/MyApplicationsPage';
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

        {/* Posting and applicant review are HR-only. */}
        <Route element={<RoleRoute allow={ROLES.HR} />}>
          <Route path={ROUTES.HR_JOBS} element={<HrJobsPage />} />
          <Route path={ROUTES.HR_JOB_APPLICANTS} element={<JobApplicantsPage />} />
        </Route>

        {/* Applying and tracking applications are candidate-only. */}
        <Route element={<RoleRoute allow={ROLES.CANDIDATE} />}>
          <Route path={ROUTES.APPLICATIONS} element={<MyApplicationsPage />} />
        </Route>
      </Route>
    </Route>

    <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.PROFILE} replace />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
