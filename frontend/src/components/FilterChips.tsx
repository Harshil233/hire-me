import { CloseIcon } from './icons';

export interface FilterChip {
  readonly key: string;
  readonly label: string;
}

export interface FilterChipsProps {
  readonly chips: readonly FilterChip[];
  readonly onRemove: (key: string) => void;
  readonly onClearAll: () => void;
}

/**
 * Shows what is currently narrowing the list, each removable in one tap. Without this
 * the filter drawer hides its own effect, and an empty result looks like a bug.
 */
export const FilterChips = ({
  chips,
  onRemove,
  onClearAll,
}: FilterChipsProps): React.JSX.Element | null => {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-1 pr-1.5 pl-3 text-xs font-medium text-fg"
        >
          {chip.label}
          <button
            type="button"
            aria-label={`Remove ${chip.label} filter`}
            onClick={() => {
              onRemove(chip.key);
            }}
            className="rounded-full p-0.5 text-fg-subtle transition hover:bg-surface-hover hover:text-fg"
          >
            <CloseIcon className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-medium text-brand-text transition hover:underline"
      >
        Clear all
      </button>
    </div>
  );
};
