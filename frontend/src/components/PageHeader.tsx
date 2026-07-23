import type { ReactNode } from 'react';

export interface PageHeaderProps {
  /** Names the section in the product's vocabulary, not the system's. */
  readonly eyebrow: string;
  readonly title: string;
  /** The count, set as data. Omitted while it is still unknown. */
  readonly count?: string | undefined;
  readonly description?: string | undefined;
  readonly action?: ReactNode;
}

/**
 * Every list opens the same way: a small mono label, a display heading, and the count
 * on the same baseline. The marigold rule under it is the page's one flash of accent.
 */
export const PageHeader = ({
  eyebrow,
  title,
  count,
  description,
  action,
}: PageHeaderProps): React.JSX.Element => (
  <header>
    <p className="eyebrow">{eyebrow}</p>

    <div className="mt-1.5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[1.75rem] leading-none font-semibold text-fg sm:text-[2rem]">
          {title}
        </h1>
        {count !== undefined && (
          <span className="numeric text-sm text-fg-subtle">{count}</span>
        )}
      </div>
      {action}
    </div>

    {description !== undefined && (
      <p className="mt-2 max-w-prose text-sm text-fg-muted">{description}</p>
    )}

    <div className="mt-4 h-px w-full bg-border">
      <div className="h-px w-16 bg-accent-line" />
    </div>
  </header>
);
