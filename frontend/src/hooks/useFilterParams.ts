import { useSearchParams } from 'react-router-dom';

import type { FilterChip } from '@/components/FilterChips';
import { countActiveFilters, readFilters, writeFilters, type FilterBag } from '@/lib/filter-params';

/** Turns a raw filter value into the words a chip shows. */
export type ChipLabeller = (key: string, value: string) => string;

export interface FilterParams<TFilters> {
  readonly filters: TFilters;
  readonly activeCount: number;
  readonly chips: readonly FilterChip[];
  readonly apply: (next: TFilters) => void;
  readonly search: (term: string) => void;
  readonly remove: (key: string) => void;
  readonly clear: () => void;
  readonly goToPage: (page: number) => void;
}

/**
 * URL-backed filter state for a listing screen. Every list page needs the same five
 * moves — read, apply, search, drop one, page — so they live here once rather than
 * being retyped per page (CLAUDE.md §9, §10).
 *
 * Applying a filter resets to page 1: staying on page 7 of a narrower result set is
 * how a list appears empty for no reason.
 */
export const useFilterParams = <TFilters extends FilterBag>(
  keys: readonly string[],
  chipLabel: ChipLabeller,
): FilterParams<TFilters> => {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = readFilters<TFilters>(searchParams, keys);

  const apply = (next: TFilters): void => {
    setSearchParams(writeFilters({ ...next, page: 1 }));
  };

  // The search term is not chipped: it is already sitting in the search box above the
  // list, with its own way to clear it, and repeating it below only reads as a bug.
  const chips = keys.flatMap((key) => {
    const value = filters[key];
    return key === 'search' || value === undefined || value === ''
      ? []
      : [{ key, label: chipLabel(key, String(value)) }];
  });

  return {
    filters,
    activeCount: countActiveFilters(filters),
    chips,
    apply,
    search: (term) => {
      apply({ ...filters, search: term === '' ? undefined : term });
    },
    remove: (key) => {
      apply({ ...filters, [key]: undefined });
    },
    clear: () => {
      apply({} as TFilters);
    },
    goToPage: (page) => {
      setSearchParams(writeFilters({ ...filters, page }));
    },
  };
};
