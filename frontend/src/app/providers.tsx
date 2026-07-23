import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useTheme } from '@/features/theme/useTheme';
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

/**
 * Restores the stored theme and tracks the OS setting. Rendered inside the provider
 * tree rather than in `App`, so tests that mount through `renderWithProviders` get the
 * same behaviour the real app has.
 */
const ThemeBootstrap = ({ children }: { readonly children: ReactNode }): React.JSX.Element => {
  useTheme();
  return <>{children}</>;
};

export const AppProviders = ({ children, queryClient }: AppProvidersProps): React.JSX.Element => (
  <QueryClientProvider client={queryClient ?? createQueryClient()}>
    <ThemeBootstrap>{children}</ThemeBootstrap>
  </QueryClientProvider>
);
