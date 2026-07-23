import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/Card';
import { FilterChips } from '@/components/FilterChips';
import { FilterDrawer } from '@/components/FilterDrawer';
import { FilterRail } from '@/components/FilterRail';
import { Pagination } from '@/components/Pagination';
import { SearchBar } from '@/components/SearchBar';
import { Skeleton } from '@/components/Skeleton';
import { PageHeader } from '@/components/PageHeader';
import { UsersIcon } from '@/components/icons';
import { JOB_TYPE_LABELS, ROUTES } from '@/config/constants';
import { CandidateCard } from '@/features/candidates/components/CandidateCard';
import { CandidateFilterFields } from '@/features/candidates/components/CandidateFilterFields';
import { useCandidates } from '@/features/candidates/hooks/useCandidates';
import type { CandidateFilters } from '@/features/candidates/schemas/candidate.schema';
import { useFilterParams } from '@/hooks/useFilterParams';
import { useIsWideScreen } from '@/hooks/useMediaQuery';

const FILTER_KEYS = ['search', 'skills', 'location', 'jobType'] as const;

const chipLabel = (key: string, value: string): string => {
  if (key === 'jobType') return JOB_TYPE_LABELS[value as keyof typeof JOB_TYPE_LABELS];
  if (key === 'search') return `“${value}”`;
  return value;
};

/** The employer's landing screen: people first, rather than a list of their own adverts. */
export const CandidatesPage = (): React.JSX.Element => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const isWide = useIsWideScreen();

  const { filters, activeCount, chips, apply, search, remove, clear, goToPage } =
    useFilterParams<CandidateFilters>(FILTER_KEYS, chipLabel);
  const query = useCandidates(filters);

  const fields = <CandidateFilterFields value={filters} onChange={apply} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find candidates"
        tone="highlight"
        count={
          query.isSuccess
            ? `${String(query.data.pagination.total)} ${query.data.pagination.total === 1 ? 'person' : 'people'}`
            : undefined
        }
        action={
          <Link to={ROUTES.HR_JOBS}>
            <Button variant="secondary">Your postings</Button>
          </Link>
        }
      />

      <div className="lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:gap-6">
        {/* Beside the results when there is room; behind a button when there is not. */}
        {isWide && (
          <FilterRail activeFilterCount={activeCount} onClear={clear}>
            {fields}
          </FilterRail>
        )}

        <div className="space-y-4">
          <SearchBar
            value={filters.search ?? ''}
            placeholder="Search by name, skill or location"
            activeFilterCount={activeCount}
            showFilterButton={!isWide}
            onSearch={search}
            onOpenFilters={() => {
              setIsFilterOpen(true);
            }}
          />

          <FilterChips chips={chips} onRemove={remove} onClearAll={clear} />

          {query.isPending && (
            <div className="grid gap-3" data-testid="candidates-loading">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          )}

          {query.isError && <Alert tone="error">{query.error.message}</Alert>}

          {query.isSuccess && query.data.candidates.length === 0 && (
            <EmptyState
              icon={<UsersIcon className="h-6 w-6" />}
              title="Nobody matches these filters"
              description="Try a broader search, or clear a filter to widen the pool."
            />
          )}

          {query.isSuccess && query.data.candidates.length > 0 && (
            <div className="grid items-start gap-3 xl:grid-cols-2">
              {query.data.candidates.map((candidate) => (
                <CandidateCard key={candidate.userId} candidate={candidate} />
              ))}
            </div>
          )}

          {query.isSuccess && (
            <Pagination
              page={query.data.pagination.page}
              totalPages={query.data.pagination.totalPages}
              total={query.data.pagination.total}
              onChange={goToPage}
            />
          )}
        </div>
      </div>

      {!isWide && (
        <FilterDrawer
          isOpen={isFilterOpen}
          activeFilterCount={activeCount}
          onClose={() => {
            setIsFilterOpen(false);
          }}
          onClear={clear}
        >
          {fields}
        </FilterDrawer>
      )}
    </div>
  );
};
