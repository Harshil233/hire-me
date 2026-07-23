import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/** Marigold for listings and actions; iris for the people half of the product. */
export type PageHeaderTone = 'accent' | 'highlight';

const RULE_CLASSES: Record<PageHeaderTone, string> = {
  accent: 'bg-accent-line',
  highlight: 'bg-highlight-line',
};

export interface PageHeaderProps {
  /** Names the section in the product's vocabulary, not the system's. */
  readonly eyebrow: string;
  readonly title: string;
  /** The count, set as data. Omitted while it is still unknown. */
  readonly count?: string | undefined;
  readonly description?: string | undefined;
  readonly action?: ReactNode;
  readonly tone?: PageHeaderTone;
}

/**
 * Every list opens the same way: a small mono label, a display heading, and the count
 * on the same baseline. The coloured rule under it is the page's one flash of accent,
 * and which colour it is tells you whether you are looking at roles or at people.
 */
export const PageHeader = ({
  eyebrow,
  title,
  count,
  description,
  action,
  tone = 'accent',
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
      <div className={cn('h-px w-16', RULE_CLASSES[tone])} data-testid="page-header-rule" />
    </div>
  </header>
);
