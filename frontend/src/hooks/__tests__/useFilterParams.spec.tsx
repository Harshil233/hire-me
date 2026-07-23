import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { FilterBag } from '@/lib/filter-params';
import { useFilterParams, type FilterParams } from '../useFilterParams';

type Filters = Readonly<{
  page?: number | undefined;
  search?: string | undefined;
  role?: string | undefined;
}> &
  FilterBag;

const KEYS = ['search', 'role'] as const;

const chipLabel = (key: string, value: string): string =>
  key === 'role' ? `Role: ${value}` : `“${value}”`;

/** Exposes the hook's return value to the test while rendering what it produces. */
const Harness = ({ onReady }: { onReady: (api: FilterParams<Filters>) => void }): null => {
  onReady(useFilterParams<Filters>(KEYS, chipLabel));
  return null;
};

const Search = (): React.JSX.Element => <span data-testid="url">{useLocation().search}</span>;

const renderHook = (initialUrl: string): { current: FilterParams<Filters>; url: () => string } => {
  const ref = { current: null as FilterParams<Filters> | null };

  render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <Harness
        onReady={(api) => {
          ref.current = api;
        }}
      />
      <Search />
    </MemoryRouter>,
  );

  return {
    get current(): FilterParams<Filters> {
      if (ref.current === null) {
        throw new Error('the hook never reported its value');
      }
      return ref.current;
    },
    url: () => screen.getByTestId('url').textContent ?? '',
  };
};

describe('useFilterParams', () => {
  it('reads the declared filters out of the URL', () => {
    const hook = renderHook('/jobs?search=react&role=engineering');

    expect(hook.current.filters.search).toBe('react');
    expect(hook.current.filters.role).toBe('engineering');
  });

  it('counts the filters that are set, ignoring paging', () => {
    expect(renderHook('/jobs?search=react&page=3').current.activeCount).toBe(1);
    expect(renderHook('/jobs').current.activeCount).toBe(0);
  });

  it('labels a chip per active filter and none for the rest', () => {
    const hook = renderHook('/jobs?search=react');

    expect(hook.current.chips).toEqual([{ key: 'search', label: '“react”' }]);
  });

  it('labels each key through the supplied labeller', () => {
    const hook = renderHook('/jobs?role=engineering');

    expect(hook.current.chips).toEqual([{ key: 'role', label: 'Role: engineering' }]);
  });

  it('writes an applied filter into the URL', () => {
    const hook = renderHook('/jobs');

    act(() => {
      hook.current.apply({ search: 'react' });
    });

    expect(hook.url()).toBe('?search=react');
  });

  it('returns to page 1 whenever a filter changes', () => {
    const hook = renderHook('/jobs?page=5&search=react');

    act(() => {
      hook.current.apply({ ...hook.current.filters, search: 'vue' });
    });

    expect(hook.url()).toBe('?search=vue');
  });

  it('clears the search when the box is emptied', () => {
    const hook = renderHook('/jobs?search=react');

    act(() => {
      hook.current.search('');
    });

    expect(hook.url()).toBe('');
  });

  it('keeps the other filters when one chip is removed', () => {
    const hook = renderHook('/jobs?search=react&role=engineering');

    act(() => {
      hook.current.remove('role');
    });

    expect(hook.url()).toBe('?search=react');
  });

  it('drops every filter on clear', () => {
    const hook = renderHook('/jobs?search=react&role=engineering&page=2');

    act(() => {
      hook.current.clear();
    });

    expect(hook.url()).toBe('');
  });

  it('pages without discarding the active filters', () => {
    const hook = renderHook('/jobs?search=react');

    act(() => {
      hook.current.goToPage(3);
    });

    const params = new URLSearchParams(hook.url());
    expect(params.get('search')).toBe('react');
    expect(params.get('page')).toBe('3');
  });

  it('leaves page 1 out of the URL', () => {
    const hook = renderHook('/jobs?search=react&page=2');

    act(() => {
      hook.current.goToPage(1);
    });

    expect(hook.url()).toBe('?search=react');
  });

  it('survives a real interaction rather than only direct calls', async () => {
    const user = userEvent.setup();
    let api: FilterParams<Filters> | null = null;

    render(
      <MemoryRouter initialEntries={['/jobs']}>
        <Harness
          onReady={(value) => {
            api = value;
          }}
        />
        <button
          type="button"
          onClick={() => {
            api?.search('react');
          }}
        >
          Search
        </button>
        <Search />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByTestId('url')).toHaveTextContent('search=react');
  });
});
