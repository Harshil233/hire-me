import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/Card';
import { FilterChips } from '@/components/FilterChips';
import { FilterDrawer } from '@/components/FilterDrawer';
import { FormField } from '@/components/FormField';
import { Pagination } from '@/components/Pagination';
import { SearchBar } from '@/components/SearchBar';
import { Select } from '@/components/Select';
import { Skeleton } from '@/components/Skeleton';
import { TextInput } from '@/components/TextInput';
import { PageHeader } from '@/components/PageHeader';
import { UsersIcon } from '@/components/icons';
import { JOB_TYPE_LABELS, JOB_TYPE_VALUES, ROUTES } from '@/config/constants';
import { CandidateCard } from '@/features/candidates/components/CandidateCard';
import { useCandidates } from '@/features/candidates/hooks/useCandidates';
import type { CandidateFilters } from '@/features/candidates/schemas/candidate.schema';
import { useFilterParams } from '@/hooks/useFilterParams';

const FILTER_KEYS = ['search', 'skills', 'location', 'jobType'] as const;

const JOB_TYPE_OPTIONS = JOB_TYPE_VALUES.map((type) => ({
  value: type,
  label: JOB_TYPE_LABELS[type],
}));

const chipLabel = (key: string, value: string): string => {
  if (key === 'jobType') return JOB_TYPE_LABELS[value as keyof typeof JOB_TYPE_LABELS];
  if (key === 'search') return `“${value}”`;
  return value;
};

/** The employer's landing screen: people first, rather than a list of their own adverts. */
export const CandidatesPage = (): React.JSX.Element => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { filters, activeCount, chips, apply, search, remove, clear, goToPage } =
    useFilterParams<CandidateFilters>(FILTER_KEYS, chipLabel);
  const query = useCandidates(filters);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Talent pool"
        title="Find candidates"
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

      <SearchBar
        value={filters.search ?? ''}
        placeholder="Search by name, skill or location"
        activeFilterCount={activeCount}
        onSearch={search}
        onOpenFilters={() => {
          setIsFilterOpen(true);
        }}
      />

      <FilterChips chips={chips} onRemove={remove} onClearAll={clear} />

      {query.isPending && (
        <div className="grid gap-4" data-testid="candidates-loading">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
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
        <div className="grid gap-3 lg:grid-cols-2">
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

      <FilterDrawer
        isOpen={isFilterOpen}
        activeFilterCount={activeCount}
        onClose={() => {
          setIsFilterOpen(false);
        }}
        onClear={clear}
      >
        <FormField label="Skills" hint="Comma separated">
          {(fieldProps) => (
            <TextInput
              {...fieldProps}
              value={filters.skills ?? ''}
              placeholder="TypeScript, React"
              onChange={(event) => {
                apply({ ...filters, skills: event.target.value || undefined });
              }}
            />
          )}
        </FormField>

        <FormField label="Location">
          {(fieldProps) => (
            <TextInput
              {...fieldProps}
              value={filters.location ?? ''}
              placeholder="e.g. Pune"
              onChange={(event) => {
                apply({ ...filters, location: event.target.value || undefined });
              }}
            />
          )}
        </FormField>

        <FormField label="Open to">
          {(fieldProps) => (
            <Select
              {...fieldProps}
              options={JOB_TYPE_OPTIONS}
              placeholder="Any job type"
              value={filters.jobType ?? ''}
              onChange={(event) => {
                apply({ ...filters, jobType: event.target.value || undefined });
              }}
            />
          )}
        </FormField>
      </FilterDrawer>
    </div>
  );
};
