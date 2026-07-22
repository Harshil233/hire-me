import { BrowserRouter } from 'react-router-dom';

import { AppProviders } from './providers';
import { AppRoutes } from './router';

export const App = (): React.JSX.Element => (
  <AppProviders>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </AppProviders>
);
