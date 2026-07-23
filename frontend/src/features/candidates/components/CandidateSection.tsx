import type { ReactNode } from 'react';

import { SectionItemContent } from '@/features/sections/components/SectionItemContent';
import type { SectionConfig } from '@/features/sections/types';

export interface CandidateSectionProps<TItem> {
  readonly icon: ReactNode;
  readonly title: string;
  readonly items: readonly TItem[];
  /** Shown instead of the list when the candidate has not filled this section in. */
  readonly emptyText: string;
  /** Reuses the section's own presenter, so this reads exactly as the owner's list does. */
  readonly present: SectionConfig<TItem, never>['present'];
}

/**
 * One read-only block of a candidate's profile. An empty section still renders: an
 * employer comparing two people needs to see that a section is blank, not be left
 * guessing whether the page failed to load it.
 */
export const CandidateSection = <TItem extends { id: string }>({
  icon,
  title,
  items,
  emptyText,
  present,
}: CandidateSectionProps<TItem>): React.JSX.Element => (
  <section className="surface-card p-5">
    <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-fg-muted uppercase">
      <span className="text-highlight-text">{icon}</span>
      {title}
    </h2>

    {items.length === 0 ? (
      <p className="mt-3 text-sm text-fg-subtle">{emptyText}</p>
    ) : (
      <ul className="mt-4 divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="flex py-4 first:pt-0 last:pb-0">
            <SectionItemContent view={present(item)} />
          </li>
        ))}
      </ul>
    )}
  </section>
);
