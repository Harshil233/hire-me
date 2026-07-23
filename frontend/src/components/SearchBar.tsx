import { useEffect, useState, type SyntheticEvent } from 'react';

import { CloseIcon, SearchIcon, SlidersIcon } from './icons';

export interface SearchBarProps {
  readonly value: string;
  readonly placeholder: string;
  /** Fires on submit and on clear, not on every keystroke. */
  readonly onSearch: (term: string) => void;
  readonly onOpenFilters: () => void;
  /** Drives the badge on the filter button. */
  readonly activeFilterCount: number;
  /** Hidden where the filters are already on screen in a rail. */
  readonly showFilterButton?: boolean;
}

/**
 * The primary way into a list: a wide search field with the filter drawer one tap away.
 * Kept as local state and submitted explicitly, so typing does not fire a request per
 * character.
 */
export const SearchBar = ({
  value,
  placeholder,
  onSearch,
  onOpenFilters,
  activeFilterCount,
  showFilterButton = true,
}: SearchBarProps): React.JSX.Element => {
  const [term, setTerm] = useState(value);

  // Keeps the field honest when the URL changes underneath it (back button, clear-all).
  useEffect(() => {
    setTerm(value);
  }, [value]);

  const submit = (event: SyntheticEvent): void => {
    event.preventDefault();
    onSearch(term.trim());
  };

  return (
    <form onSubmit={submit} className="flex gap-2" role="search">
      <div className="relative flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4.5 w-4.5 -translate-y-1/2 text-fg-subtle" />
        <input
          type="search"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          className="field-control py-3 pr-10 pl-11"
        />
        {term !== '' && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setTerm('');
              onSearch('');
            }}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-fg-subtle transition hover:bg-surface-hover hover:text-fg"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {showFilterButton && (
        <button
          type="button"
          onClick={onOpenFilters}
          aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : 'Filters'}
          className="relative inline-flex shrink-0 items-center gap-2 rounded-[var(--radius-control)] border border-border bg-surface px-4 text-sm font-medium text-fg transition hover:border-border-strong hover:bg-surface-hover"
        >
          <SlidersIcon className="h-4.5 w-4.5" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span
              data-testid="active-filter-count"
              className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-fg-on-brand"
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      )}
    </form>
  );
};
