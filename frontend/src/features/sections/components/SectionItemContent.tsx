import type { SectionItemView } from '../types';

export interface SectionItemContentProps {
  readonly view: SectionItemView;
}

/**
 * How one section record reads. Shared by the owner's editable list and the read-only
 * view an employer sees, so the two can never drift apart (CLAUDE.md §9).
 */
export const SectionItemContent = ({ view }: SectionItemContentProps): React.JSX.Element => (
  <div className="min-w-0 flex-1">
    <p className="font-medium text-fg">{view.title}</p>

    {view.subtitle !== undefined && view.subtitle !== '' && (
      <p className="text-sm text-fg-muted">{view.subtitle}</p>
    )}

    {view.meta !== undefined && view.meta !== '' && (
      <p className="mt-0.5 text-xs text-fg-muted">{view.meta}</p>
    )}

    {view.description !== undefined && view.description !== '' && (
      <p className="mt-2 text-sm whitespace-pre-line text-fg-muted">{view.description}</p>
    )}

    {view.link !== undefined && view.link !== '' && (
      <a
        href={view.link}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-2 inline-block text-sm font-medium text-accent-text hover:underline"
      >
        View link
      </a>
    )}

    {view.tags !== undefined && view.tags.length > 0 && (
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {view.tags.map((tag) => (
          <li
            key={tag}
            className="rounded-md bg-surface-inset px-2 py-0.5 text-xs font-medium text-fg-muted"
          >
            {tag}
          </li>
        ))}
      </ul>
    )}
  </div>
);
