import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useIsWideScreen, useMediaQuery } from '../useMediaQuery';

type Listener = (event: MediaQueryListEvent) => void;

/** Replaces `matchMedia` with one whose answer the test controls. */
const stubMatchMedia = (
  matches: boolean,
): { fire: (next: boolean) => void; removed: () => boolean; lastQuery: () => string } => {
  const listeners = new Set<Listener>();
  let removedCount = 0;
  let query = '';

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (asked: string) => {
      query = asked;
      return {
        matches,
        media: asked,
        addEventListener: (_: string, listener: Listener) => listeners.add(listener),
        removeEventListener: (_: string, listener: Listener) => {
          removedCount += 1;
          listeners.delete(listener);
        },
      };
    },
  });

  return {
    fire: (next) => {
      for (const listener of listeners) {
        listener({ matches: next } as MediaQueryListEvent);
      }
    },
    removed: () => removedCount > 0,
    lastQuery: () => query,
  };
};

const Harness = ({ query }: { query: string }): React.JSX.Element => (
  <span data-testid="result">{useMediaQuery(query) ? 'wide' : 'narrow'}</span>
);

const WideHarness = (): React.JSX.Element => (
  <span data-testid="result">{useIsWideScreen() ? 'wide' : 'narrow'}</span>
);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useMediaQuery', () => {
  it('reports a query that already matches', () => {
    stubMatchMedia(true);

    render(<Harness query="(min-width: 1024px)" />);

    expect(screen.getByTestId('result')).toHaveTextContent('wide');
  });

  it('reports a query that does not match', () => {
    stubMatchMedia(false);

    render(<Harness query="(min-width: 1024px)" />);

    expect(screen.getByTestId('result')).toHaveTextContent('narrow');
  });

  it('follows the viewport when it changes', () => {
    const media = stubMatchMedia(false);

    render(<Harness query="(min-width: 1024px)" />);
    act(() => {
      media.fire(true);
    });

    expect(screen.getByTestId('result')).toHaveTextContent('wide');
  });

  it('stops listening once unmounted', () => {
    const media = stubMatchMedia(true);

    render(<Harness query="(min-width: 1024px)" />).unmount();

    expect(media.removed()).toBe(true);
  });

  it('answers narrow where matchMedia is unavailable, rather than throwing', () => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: undefined });

    render(<Harness query="(min-width: 1024px)" />);

    expect(screen.getByTestId('result')).toHaveTextContent('narrow');
  });

  it('asks for the breakpoint the filter rail needs', () => {
    const media = stubMatchMedia(true);

    render(<WideHarness />);

    expect(media.lastQuery()).toBe('(min-width: 1024px)');
    expect(screen.getByTestId('result')).toHaveTextContent('wide');
  });
});
