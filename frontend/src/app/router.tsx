import { Navigate, Route, Routes } from 'react-router-dom';

import { ROUTES } from '@/config/constants';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RegisterPage } from '@/pages/RegisterPage';
import { AppLayout } from './AppLayout';
import { ProtectedRoute, PublicOnlyRoute } from './guards';

export const AppRoutes = (): React.JSX.Element => (
  <Routes>
    <Route element={<PublicOnlyRoute />}>
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
    </Route>

    <Route element={<ProtectedRoute />}>
      <Route element={<AppLayout />}>
        <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
      </Route>
    </Route>

    <Route path={ROUTES.ROOT} element={<Navigate to={ROUTES.PROFILE} replace />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);
