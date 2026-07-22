import type { ReactElement, ReactNode } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AppProviders } from '@/app/providers';

/** Query client with retries and caching disabled, so tests are deterministic. */
export const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

export interface RenderOptions {
  readonly route?: string;
  readonly queryClient?: QueryClient;
}

/**
 * Only the pieces a test needs from the render call. Queries are read through
 * `screen`, so they are deliberately not re-exported here — under
 * `exactOptionalPropertyTypes`, Testing Library's query generic does not survive the
 * `wrapper`-only options object.
 */
export interface RenderWithProvidersResult {
  readonly queryClient: QueryClient;
  readonly unmount: () => void;
  readonly rerender: (ui: ReactElement) => void;
}

/** Renders a tree inside the app's real providers and an in-memory router. */
export const renderWithProviders = (
  ui: ReactElement,
  { route = '/', queryClient = createTestQueryClient() }: RenderOptions = {},
): RenderWithProvidersResult => {
  const Wrapper = ({ children }: { children: ReactNode }): ReactElement => (
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </AppProviders>
  );

  const { unmount, rerender } = render(ui, { wrapper: Wrapper });

  return { queryClient, unmount, rerender };
};
