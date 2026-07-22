import { useSearchParams } from 'react-router-dom';

import { Alert } from '@/components/Alert';
import { EmptyState } from '@/components/Card';
import { Pagination } from '@/components/Pagination';
import { Skeleton } from '@/components/Skeleton';
import { JobCard } from '@/features/jobs/components/JobCard';
import { JobFiltersPanel } from '@/features/jobs/components/JobFilters';
import { useJobs } from '@/features/jobs/hooks/useJobs';
import type { JobFilters } from '@/features/jobs/schemas/job.schema';

/** Filters live in the URL so a filtered search survives a reload and can be shared. */
const toFilters = (params: URLSearchParams): JobFilters => ({
  page: Number(params.get('page') ?? '1'),
  search: params.get('search') ?? undefined,
  role: params.get('role') ?? undefined,
  jobType: params.get('jobType') ?? undefined,
  workMode: params.get('workMode') ?? undefined,
  location: params.get('location') ?? undefined,
  minCtc: params.get('minCtc') ?? undefined,
  maxExperienceYears: params.get('maxExperienceYears') ?? undefined,
});

const toSearchParams = (filters: JobFilters): Record<string, string> => {
  const next: Record<string, string> = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && String(value).trim() !== '' && !(key === 'page' && value === 1)) {
      next[key] = String(value);
    }
  }

  return next;
};

export const JobsPage = (): React.JSX.Element => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = toFilters(searchParams);
  const query = useJobs(filters);

  const apply = (next: JobFilters): void => {
    setSearchParams(toSearchParams(next));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
      <JobFiltersPanel value={filters} onChange={apply} />

      <section aria-label="Job results" className="space-y-4">
        {query.isPending && (
          <div className="space-y-3" data-testid="jobs-loading">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        )}

        {query.isError && <Alert tone="error">{query.error.message}</Alert>}

        {query.isSuccess && query.data.jobs.length === 0 && (
          <EmptyState
            title="No jobs match these filters"
            description="Try widening your search or clearing a filter."
          />
        )}

        {query.isSuccess &&
          query.data.jobs.map((job) => <JobCard key={job.id} job={job} />)}

        {query.isSuccess && (
          <Pagination
            page={query.data.pagination.page}
            totalPages={query.data.pagination.totalPages}
            total={query.data.pagination.total}
            onChange={(page) => {
              apply({ ...filters, page });
            }}
          />
        )}
      </section>
    </div>
  );
};
