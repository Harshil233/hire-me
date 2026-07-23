import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/Card';
import { Pagination } from '@/components/Pagination';
import { Skeleton } from '@/components/Skeleton';
import { JOB_STATUS_VALUES, jobApplicantsPath } from '@/config/constants';
import { JobCard } from '@/features/jobs/components/JobCard';
import { JobFormModal } from '@/features/jobs/components/JobFormModal';
import { useJobMutations, useMyJobs } from '@/features/jobs/hooks/useJobs';
import type { Job, JobFilters } from '@/features/jobs/schemas/job.schema';

/** Which lifecycle action a posting offers next, derived from its current status. */
const nextAction = (job: Job): { label: string; status: (typeof JOB_STATUS_VALUES)[number] } =>
  job.status === 'published'
    ? { label: 'Close', status: 'closed' }
    : { label: 'Publish', status: 'published' };

export const HrJobsPage = (): React.JSX.Element => {
  const [filters, setFilters] = useState<JobFilters>({ page: 1 });
  const [editing, setEditing] = useState<Job | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

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
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-fg">Your postings</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            Drafts stay private until you publish them.
          </p>
        </div>
        <Button onClick={openCreate}>Post a job</Button>
      </header>

      {query.isPending && (
        <div className="space-y-3" data-testid="my-jobs-loading">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      )}

      {query.isError && <Alert tone="error">{query.error.message}</Alert>}

      {changeStatus.isError && <Alert tone="error">{changeStatus.error.message}</Alert>}

      {query.isSuccess && query.data.jobs.length === 0 && (
        <EmptyState
          title="You have not posted a job yet"
          description="Create your first listing to start receiving applications."
          action={<Button onClick={openCreate}>Post your first job</Button>}
        />
      )}

      {query.isSuccess &&
        query.data.jobs.map((job) => (
          <div key={job.id} className="space-y-2">
            <JobCard job={job} showStatus />
            <div className="flex justify-end gap-2">
              <Link to={jobApplicantsPath(job.id)}>
                <Button size="sm" variant="secondary">
                  View applicants
                </Button>
              </Link>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  openEdit(job);
                }}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant="secondary"
                isLoading={changeStatus.isPending && changeStatus.variables.id === job.id}
                onClick={() => {
                  changeStatus.mutate({ id: job.id, status: nextAction(job).status });
                }}
              >
                {nextAction(job).label}
              </Button>
            </div>
          </div>
        ))}

      {query.isSuccess && (
        <Pagination
          page={query.data.pagination.page}
          totalPages={query.data.pagination.totalPages}
          total={query.data.pagination.total}
          onChange={(page) => {
            setFilters({ ...filters, page });
          }}
        />
      )}

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
