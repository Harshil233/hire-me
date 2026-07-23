import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

/** Marigold for listings and actions; iris for the people half of the product. */
export type PageHeaderTone = 'accent' | 'highlight';

const RULE_CLASSES: Record<PageHeaderTone, string> = {
  accent: 'bg-accent-line',
  highlight: 'bg-highlight-line',
};

export interface PageHeaderProps {
  readonly title: string;
  /** How many rows are below. Omitted while it is still unknown. */
  readonly count?: string | undefined;
  readonly description?: string | undefined;
  readonly action?: ReactNode;
  readonly tone?: PageHeaderTone;
}

/**
 * The title, the count, and whatever this screen's one action is — all on one line, at
 * the top of the page. There used to be a label above the title naming the section the
 * navigation had already named, which cost a line of height and told nobody anything.
 */
export const PageHeader = ({
  title,
  count,
  description,
  action,
  tone = 'accent',
}: PageHeaderProps): React.JSX.Element => (
  <header>
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <h1 className="text-[1.625rem] leading-none font-semibold text-fg sm:text-[1.875rem]">
        {title}
      </h1>

      <div className="flex items-center gap-4">
        {count !== undefined && <span className="numeric text-sm text-fg-muted">{count}</span>}
        {action}
      </div>
    </div>

    {description !== undefined && (
      <p className="mt-2 max-w-prose text-sm text-fg-muted">{description}</p>
    )}

    <div className="mt-3.5 h-px w-full bg-border">
      <div className={cn('h-px w-16', RULE_CLASSES[tone])} data-testid="page-header-rule" />
    </div>
  </header>
);
