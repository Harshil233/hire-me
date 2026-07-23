import type { ReactNode } from 'react';

import { SectionItemContent } from '@/features/sections/components/SectionItemContent';
import type { SectionConfig } from '@/features/sections/types';

export interface CandidateSectionProps<TItem> {
  readonly icon: ReactNode;
  readonly title: string;
  readonly items: readonly TItem[];
  /** Reuses the section's own presenter, so this reads exactly as the owner's list does. */
  readonly present: SectionConfig<TItem, never>['present'];
}

/**
 * One read-only block of a candidate's profile. Renders nothing when the candidate left
 * the section empty — an employer does not need to be told what someone has not done.
 */
export const CandidateSection = <TItem extends { id: string }>({
  icon,
  title,
  items,
  present,
}: CandidateSectionProps<TItem>): React.JSX.Element | null => {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="surface-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-fg-muted uppercase">
        <span className="text-highlight-text">{icon}</span>
        {title}
      </h2>

      <ul className="mt-4 divide-y divide-border">
        {items.map((item) => (
          <li key={item.id} className="flex py-4 first:pt-0 last:pb-0">
            <SectionItemContent view={present(item)} />
          </li>
        ))}
      </ul>
    </section>
  );
};
