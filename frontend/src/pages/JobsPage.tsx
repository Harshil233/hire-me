import { useState } from 'react';

import { Alert } from '@/components/Alert';
import { EmptyState } from '@/components/Card';
import { FilterChips } from '@/components/FilterChips';
import { FilterDrawer } from '@/components/FilterDrawer';
import { Pagination } from '@/components/Pagination';
import { SearchBar } from '@/components/SearchBar';
import { Skeleton } from '@/components/Skeleton';
import { PageHeader } from '@/components/PageHeader';
import { BriefcaseIcon } from '@/components/icons';
import { JOB_ROLE_LABELS, JOB_TYPE_LABELS, WORK_MODE_LABELS } from '@/config/constants';
import { JobCard } from '@/features/jobs/components/JobCard';
import { payScaleOf } from '@/features/jobs/utils/pay-scale';
import { JobFilterFields } from '@/features/jobs/components/JobFilterFields';
import { useJobs } from '@/features/jobs/hooks/useJobs';
import type { JobFilters } from '@/features/jobs/schemas/job.schema';
import { useFilterParams } from '@/hooks/useFilterParams';

const FILTER_KEYS = [
  'search',
  'role',
  'jobType',
  'workMode',
  'location',
  'minCtc',
  'maxExperienceYears',
] as const;

/** Human labels for the chips, so a chip reads "Remote" rather than "workMode: remote". */
const chipLabel = (key: string, value: string): string => {
  if (key === 'role') return JOB_ROLE_LABELS[value as keyof typeof JOB_ROLE_LABELS];
  if (key === 'jobType') return JOB_TYPE_LABELS[value as keyof typeof JOB_TYPE_LABELS];
  if (key === 'workMode') return WORK_MODE_LABELS[value as keyof typeof WORK_MODE_LABELS];
  if (key === 'minCtc') return `Min ₹${Number(value).toLocaleString('en-IN')}`;
  if (key === 'maxExperienceYears') return `${value} yrs experience`;
  if (key === 'search') return `“${value}”`;
  return value;
};

export const JobsPage = (): React.JSX.Element => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { filters, activeCount, chips, apply, search, remove, clear, goToPage } =
    useFilterParams<JobFilters>(FILTER_KEYS, chipLabel);
  const query = useJobs(filters);
  // One scale for the whole page, so the bands compare against each other.
  const scale = payScaleOf(query.data?.jobs ?? []);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Hiring now"
        title="Open roles"
        count={
          query.isSuccess
            ? `${String(query.data.pagination.total)} ${query.data.pagination.total === 1 ? 'role' : 'roles'}`
            : undefined
        }
      />

      <SearchBar
        value={filters.search ?? ''}
        placeholder="Search by role, company, skill or location"
        activeFilterCount={activeCount}
        onSearch={search}
        onOpenFilters={() => {
          setIsFilterOpen(true);
        }}
      />

      <FilterChips chips={chips} onRemove={remove} onClearAll={clear} />

      {query.isPending && (
        <div className="grid gap-4" data-testid="jobs-loading">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      )}

      {query.isError && <Alert tone="error">{query.error.message}</Alert>}

      {query.isSuccess && query.data.jobs.length === 0 && (
        <EmptyState
          icon={<BriefcaseIcon className="h-6 w-6" />}
          title="No roles match these filters"
          description="Try a broader search, or clear a filter or two to see more."
        />
      )}

      {query.isSuccess && query.data.jobs.length > 0 && (
        <div className="grid gap-3">
          {query.data.jobs.map((job) => (
            <JobCard key={job.id} job={job} scale={scale} />
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
        <JobFilterFields value={filters} onChange={apply} />
      </FilterDrawer>
    </div>
  );
};
