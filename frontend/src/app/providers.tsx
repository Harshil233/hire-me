import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { isApiError } from '@/services/api-error';

/** A 4xx will not succeed on retry; only transport-level failures are retried once. */
export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (isApiError(error) && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });

export interface AppProvidersProps {
  readonly children: ReactNode;
  /** Injected in tests so each case gets an isolated cache. */
  readonly queryClient?: QueryClient;
}

export const AppProviders = ({ children, queryClient }: AppProvidersProps): React.JSX.Element => (
  <QueryClientProvider client={queryClient ?? createQueryClient()}>{children}</QueryClientProvider>
);
