import { Navigate, Route, Routes } from 'react-router-dom';

import { ROLES, ROUTES, landingPathFor } from '@/config/constants';
import { CandidateDetailPage } from '@/pages/CandidateDetailPage';
import { CandidatesPage } from '@/pages/CandidatesPage';
import { HrJobsPage } from '@/pages/HrJobsPage';
import { JobApplicantsPage } from '@/pages/JobApplicantsPage';
import { JobDetailPage } from '@/pages/JobDetailPage';
import { JobsPage } from '@/pages/JobsPage';
import { LoginPage } from '@/pages/LoginPage';
import { MyApplicationsPage } from '@/pages/MyApplicationsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RegisterPage } from '@/pages/RegisterPage';
import { useAuthStore } from '@/store/auth.store';
import { AppLayout } from './AppLayout';
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from './guards';

/** Sends `/` to whichever list the signed-in role came for. */
const RootRedirect = (): React.JSX.Element => {
  const user = useAuthStore((state) => state.user);

  return <Navigate to={user === null ? ROUTES.JOBS : landingPathFor(user.role)} replace />;
};

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

        {/* Posting, applicant review and the talent pool are HR-only. */}
        <Route element={<RoleRoute allow={ROLES.HR} />}>
          <Route path={ROUTES.CANDIDATES} element={<CandidatesPage />} />
          <Route path={ROUTES.CANDIDATE_DETAIL} element={<CandidateDetailPage />} />
          <Route path={ROUTES.HR_JOBS} element={<HrJobsPage />} />
          <Route path={ROUTES.HR_JOB_APPLICANTS} element={<JobApplicantsPage />} />
        </Route>

        {/* Applying and tracking applications are candidate-only. */}
        <Route element={<RoleRoute allow={ROLES.CANDIDATE} />}>
          <Route path={ROUTES.APPLICATIONS} element={<MyApplicationsPage />} />
        </Route>

        <Route path={ROUTES.ROOT} element={<RootRedirect />} />
      </Route>
    </Route>

    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
