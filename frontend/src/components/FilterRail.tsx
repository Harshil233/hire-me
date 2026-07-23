import type { ReactNode } from 'react';

export interface FilterRailProps {
  readonly activeFilterCount: number;
  readonly onClear: () => void;
  readonly children: ReactNode;
}

/**
 * Filters kept in view beside the results on a wide screen, rather than behind a button.
 * On a list you narrow repeatedly, hiding the controls costs a tap per adjustment and
 * hides what is currently applied; there is room for them here, so they stay out.
 */
export const FilterRail = ({
  activeFilterCount,
  onClear,
  children,
}: FilterRailProps): React.JSX.Element => (
  <aside aria-label="Filters" className="sticky top-24 self-start">
    <div className="surface-card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="eyebrow">Filters</h2>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-accent-text transition hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="mt-4 space-y-4">{children}</div>
    </div>
  </aside>
);
