import { useActiveSection } from '@/hooks/useActiveSection';
import { cn } from '@/lib/cn';

export interface ProfileSectionLink {
  readonly id: string;
  readonly label: string;
}

export interface ProfileQuickLinksProps {
  readonly sections: readonly ProfileSectionLink[];
}

/**
 * A contents list for a profile, which is long and edited a section at a time. Plain
 * anchors rather than scroll handling: the browser already knows how to reach an element
 * by id, and the links stay usable with JavaScript busy.
 *
 * The section being read is marked as you scroll, so the list answers "where am I" as
 * well as "where can I go" — on a page this long, the first question is asked more often.
 */
export const ProfileQuickLinks = ({ sections }: ProfileQuickLinksProps): React.JSX.Element => {
  const activeId = useActiveSection(sections.map((section) => section.id));

  return (
    <nav aria-label="Profile sections" className="sticky top-24 self-start">
      <div className="surface-card p-4">
        <h2 className="eyebrow px-2">On this page</h2>

        <ul className="mt-2">
          {sections.map((section) => {
            const isActive = section.id === activeId;

            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={isActive ? 'true' : undefined}
                  className={cn(
                    // The rule on the left carries the state; the text weight only
                    // confirms it, so nothing jumps as the marker moves down the list.
                    'block border-l-2 py-1.5 pr-2 pl-2.5 text-sm transition',
                    'rounded-r-[var(--radius-control)]',
                    isActive
                      ? 'border-accent bg-accent-soft font-medium text-fg'
                      : 'border-transparent text-fg-muted hover:bg-surface-hover hover:text-fg',
                  )}
                >
                  {section.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};
