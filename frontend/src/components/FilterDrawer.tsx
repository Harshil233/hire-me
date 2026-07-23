import { useEffect, type ReactNode } from 'react';

import { Button } from './Button';
import { CloseIcon } from './icons';

export interface FilterDrawerProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onClear: () => void;
  readonly activeFilterCount: number;
  readonly children: ReactNode;
}

/**
 * Slide-over holding the filter controls. A panel rather than a sidebar so the list
 * itself gets the full width, and so the same component works on a phone — where it
 * covers the screen — and on a desktop, where it docks to the right.
 */
export const FilterDrawer = ({
  isOpen,
  onClose,
  onClear,
  activeFilterCount,
  children,
}: FilterDrawerProps): React.JSX.Element | null => {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close filters"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-slate-900/40 backdrop-blur-sm"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        className="relative z-10 flex h-full w-full max-w-sm flex-col border-l border-border bg-surface shadow-[var(--shadow-lg)]"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-fg">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-fg-subtle transition hover:bg-surface-hover hover:text-fg"
          >
            <CloseIcon className="h-4.5 w-4.5" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">{children}</div>

        <footer className="flex gap-2 border-t border-border px-5 py-4">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={activeFilterCount === 0}
            onClick={onClear}
          >
            Clear all
          </Button>
          <Button className="flex-1" onClick={onClose}>
            Show results
          </Button>
        </footer>
      </aside>
    </div>
  );
};
