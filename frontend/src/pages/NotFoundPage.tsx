import { Link } from 'react-router-dom';

import { ROUTES } from '@/config/constants';

export const NotFoundPage = (): React.JSX.Element => (
  <div className="flex min-h-full flex-col items-center justify-center px-4 py-20 text-center">
    <p className="text-sm font-semibold tracking-wide text-brand-600 uppercase">404</p>
    <h1 className="mt-2 text-2xl font-semibold text-slate-900">Page not found</h1>
    <p className="mt-2 text-sm text-slate-500">
      The page you are looking for does not exist or has moved.
    </p>
    <Link
      to={ROUTES.ROOT}
      className="mt-6 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
    >
      Go home
    </Link>
  </div>
);
