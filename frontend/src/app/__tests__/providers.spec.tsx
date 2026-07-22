import { render, screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/api-error';
import { App } from '../App';
import { AppProviders, createQueryClient } from '../providers';

describe('createQueryClient', () => {
  const retryFor = (error: unknown, failureCount = 0): boolean => {
    const retry = createQueryClient().getDefaultOptions().queries?.retry;
    return typeof retry === 'function' ? retry(failureCount, error as Error) : false;
  };

  it('never retries a client error', () => {
    expect(retryFor(new ApiError(404, 'NOT_FOUND', 'Missing'))).toBe(false);
    expect(retryFor(new ApiError(422, 'VALIDATION_ERROR', 'Invalid'))).toBe(false);
  });

  it('retries a server or transport error once', () => {
    expect(retryFor(new ApiError(500, 'INTERNAL_ERROR', 'Oops'), 0)).toBe(true);
    expect(retryFor(new ApiError(500, 'INTERNAL_ERROR', 'Oops'), 1)).toBe(false);
    expect(retryFor(new Error('offline'), 0)).toBe(true);
  });

  it('never retries a mutation', () => {
    expect(createQueryClient().getDefaultOptions().mutations?.retry).toBe(false);
  });
});

describe('AppProviders', () => {
  it('makes the query client available to children', () => {
    const Probe = (): React.JSX.Element => {
      const query = useQuery({ queryKey: ['probe'], queryFn: () => 'ready' });
      return <span>{query.data ?? 'loading'}</span>;
    };

    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
  });
});

describe('App', () => {
  it('mounts the router without crashing', () => {
    // The unauthenticated boot path hits `/refresh`; the failure is expected here.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(<App />);

    expect(screen.getByRole('status', { name: 'Restoring your session' })).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
