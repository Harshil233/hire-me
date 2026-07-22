import { Button } from './Button';

export interface PaginationProps {
  readonly page: number;
  readonly totalPages: number;
  readonly total: number;
  readonly onChange: (page: number) => void;
}

/** Shared prev/next pager. Presentational: the page above owns the current page. */
export const Pagination = ({
  page,
  totalPages,
  total,
  onChange,
}: PaginationProps): React.JSX.Element | null => {
  if (total === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4"
    >
      <p className="text-sm text-slate-500">
        Page {page} of {totalPages} · {total} {total === 1 ? 'result' : 'results'}
      </p>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => {
            onChange(page - 1);
          }}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={page >= totalPages}
          onClick={() => {
            onChange(page + 1);
          }}
        >
          Next
        </Button>
      </div>
    </nav>
  );
};
