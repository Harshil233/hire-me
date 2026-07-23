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
 */
export const ProfileQuickLinks = ({ sections }: ProfileQuickLinksProps): React.JSX.Element => (
  <nav aria-label="Profile sections" className="sticky top-24 self-start">
    <div className="surface-card p-4">
      <h2 className="eyebrow px-2">On this page</h2>

      <ul className="mt-2">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="block rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-fg-muted transition hover:bg-surface-hover hover:text-fg"
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  </nav>
);
