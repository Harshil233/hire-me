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
import { PageHeader } from '@/components/PageHeader';
import { BriefcaseIcon, PencilIcon, PlusIcon, UsersIcon } from '@/components/icons';
import { JOB_STATUS_LABELS, JOB_STATUS_VALUES, jobApplicantsPath } from '@/config/constants';
import { JobCard } from '@/features/jobs/components/JobCard';
import { JobFormModal } from '@/features/jobs/components/JobFormModal';
import { useJobMutations, useMyJobs } from '@/features/jobs/hooks/useJobs';
import type { Job, JobFilters } from '@/features/jobs/schemas/job.schema';
import { useFilterParams } from '@/hooks/useFilterParams';

const FILTER_KEYS = ['search', 'status'] as const;

const STATUS_OPTIONS = JOB_STATUS_VALUES.map((status) => ({
  value: status,
  label: JOB_STATUS_LABELS[status],
}));

/** Which lifecycle action a posting offers next, derived from its current status. */
const nextAction = (job: Job): { label: string; status: (typeof JOB_STATUS_VALUES)[number] } =>
  job.status === 'published'
    ? { label: 'Close', status: 'closed' }
    : { label: 'Publish', status: 'published' };

/* Only the status filter is chipped; the search term stays in the search box. */
const chipLabel = (_key: string, value: string): string =>
  JOB_STATUS_LABELS[value as keyof typeof JOB_STATUS_LABELS];

export const HrJobsPage = (): React.JSX.Element => {
  const [editing, setEditing] = useState<Job | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { filters, activeCount, chips, apply, search, remove, clear, goToPage } =
    useFilterParams<JobFilters>(FILTER_KEYS, chipLabel);
  const query = useMyJobs(filters);
  const { save, changeStatus } = useJobMutations();

  const openCreate = (): void => {
    setEditing(null);
    save.reset();
    setIsFormOpen(true);
  };

  const openEdit = (job: Job): void => {
    setEditing(job);
    save.reset();
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Postings"
        count={
          query.isSuccess
            ? `${String(query.data.pagination.total)} ${query.data.pagination.total === 1 ? 'listing' : 'listings'}`
            : undefined
        }
        description="Drafts stay private until you publish them."
        action={
          <Button leadingIcon={<PlusIcon className="h-4 w-4" />} onClick={openCreate}>
            Post a job
          </Button>
        }
      />

      <SearchBar
        value={filters.search ?? ''}
        placeholder="Search your postings"
        activeFilterCount={activeCount}
        onSearch={search}
        onOpenFilters={() => {
          setIsFilterOpen(true);
        }}
      />

      <FilterChips chips={chips} onRemove={remove} onClearAll={clear} />

      {query.isPending && (
        <div className="grid gap-4" data-testid="my-jobs-loading">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      )}

      {query.isError && <Alert tone="error">{query.error.message}</Alert>}
      {changeStatus.isError && <Alert tone="error">{changeStatus.error.message}</Alert>}

      {query.isSuccess && query.data.jobs.length === 0 && (
        <EmptyState
          icon={<BriefcaseIcon className="h-6 w-6" />}
          title={activeCount > 0 ? 'No postings match' : 'You have not posted a job yet'}
          description={
            activeCount > 0
              ? 'Try clearing the search or the status filter.'
              : 'Create your first listing to start receiving applications.'
          }
          action={
            activeCount > 0 ? undefined : (
              <Button leadingIcon={<PlusIcon className="h-4 w-4" />} onClick={openCreate}>
                Post your first job
              </Button>
            )
          }
        />
      )}

      {query.isSuccess && query.data.jobs.length > 0 && (
        <div className="grid gap-3">
          {query.data.jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              showStatus
              actions={
                <>
                  <Link to={jobApplicantsPath(job.id)} className="contents">
                    <Button
                      size="sm"
                      variant="secondary"
                      leadingIcon={<UsersIcon className="h-4 w-4" />}
                    >
                      View applicants
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="secondary"
                    leadingIcon={<PencilIcon className="h-4 w-4" />}
                    onClick={() => {
                      openEdit(job);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant={job.status === 'published' ? 'secondary' : 'primary'}
                    isLoading={changeStatus.isPending && changeStatus.variables.id === job.id}
                    onClick={() => {
                      changeStatus.mutate({ id: job.id, status: nextAction(job).status });
                    }}
                  >
                    {nextAction(job).label}
                  </Button>
                </>
              }
            />
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
        <FormField label="Status">
          {(fieldProps) => (
            <Select
              {...fieldProps}
              options={STATUS_OPTIONS}
              placeholder="Any status"
              value={filters.status ?? ''}
              onChange={(event) => {
                apply({ ...filters, status: event.target.value || undefined });
              }}
            />
          )}
        </FormField>
      </FilterDrawer>

      {isFormOpen && (
        <JobFormModal
          // Remounts between create and edit so the form starts from the right values.
          key={editing?.id ?? 'new'}
          isOpen={isFormOpen}
          job={editing}
          isSaving={save.isPending}
          error={save.error}
          onClose={() => {
            setIsFormOpen(false);
          }}
          onSubmit={(values) => {
            save.mutate(
              { id: editing?.id, values },
              {
                onSuccess: () => {
                  setIsFormOpen(false);
                },
              },
            );
          }}
        />
      )}
    </div>
  );
};
