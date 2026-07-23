import { Button } from '@/components/Button';
import type { SectionItemView } from '../types';

export interface SectionItemRowProps {
  readonly view: SectionItemView;
  readonly isDeleting: boolean;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}

export const SectionItemRow = ({
  view,
  isDeleting,
  onEdit,
  onDelete,
}: SectionItemRowProps): React.JSX.Element => (
  <li className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
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
          className="mt-2 inline-block text-sm font-medium text-brand-text hover:text-brand-800 hover:underline"
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

    <div className="flex shrink-0 gap-1">
      <Button size="sm" variant="ghost" onClick={onEdit} aria-label={`Edit ${view.title}`}>
        Edit
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onDelete}
        isLoading={isDeleting}
        aria-label={`Delete ${view.title}`}
        className="text-danger hover:bg-red-50"
      >
        Delete
      </Button>
    </div>
  </li>
);
