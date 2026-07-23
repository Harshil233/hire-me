import { Button } from '@/components/Button';
import { SectionItemContent } from './SectionItemContent';
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
    <SectionItemContent view={view} />

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
        className="text-danger hover:bg-danger-soft"
      >
        Delete
      </Button>
    </div>
  </li>
);
