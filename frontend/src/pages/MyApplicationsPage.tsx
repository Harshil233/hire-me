import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/Card';
import { Pagination } from '@/components/Pagination';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/Skeleton';
import { ROUTES, jobDetailPath } from '@/config/constants';
import { ApplicationStatusBadge } from '@/features/applications/components/ApplicationStatusBadge';
import { APPLICATION_STATUSES_UI } from '@/features/applications/constants';
import {
  useChangeApplicationStatus,
  useMyApplications,
} from '@/features/applications/hooks/useApplications';
import type { ApplicationFilters } from '@/features/applications/schemas/application.schema';
import { formatDateRange } from '@/lib/format';

export const MyApplicationsPage = (): React.JSX.Element => {
  const [filters, setFilters] = useState<ApplicationFilters>({ page: 1 });
  const query = useMyApplications(filters);
  const changeStatus = useChangeApplicationStatus();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Applications"
        count={query.isSuccess ? `${String(query.data.pagination.total)} sent` : undefined}
        description="Every role you have applied to, and where each one stands."
      />

      {query.isPending && (
        <div className="space-y-3" data-testid="applications-loading">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      )}

      {query.isError && <Alert tone="error">{query.error.message}</Alert>}
      {changeStatus.isError && <Alert tone="error">{changeStatus.error.message}</Alert>}

      {query.isSuccess && query.data.applications.length === 0 && (
        <EmptyState
          title="You have not applied to anything yet"
          description="Browse the open roles and apply to the ones that fit."
          action={
            <Link to={ROUTES.JOBS}>
              <Button>Browse jobs</Button>
            </Link>
          }
        />
      )}

      {query.isSuccess &&
        query.data.applications.map((application) => (
          <article key={application.id} className="surface-card px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-fg">
                  <Link
                    to={jobDetailPath(application.job.id)}
                    className="hover:text-brand-text hover:underline"
                  >
                    {application.job.title}
                  </Link>
                </h2>
                <p className="mt-0.5 text-sm text-fg-muted">{application.job.company.name}</p>
              </div>
              <ApplicationStatusBadge status={application.status} />
            </div>

            <p className="mt-2 text-sm text-fg-muted">
              Applied {formatDateRange(application.createdAt, undefined, false)}
            </p>

            {application.status !== APPLICATION_STATUSES_UI.WITHDRAWN && (
              <div className="mt-3 flex justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  isLoading={changeStatus.isPending && changeStatus.variables.id === application.id}
                  onClick={() => {
                    changeStatus.mutate({
                      id: application.id,
                      status: APPLICATION_STATUSES_UI.WITHDRAWN,
                    });
                  }}
                >
                  Withdraw
                </Button>
              </div>
            )}
          </article>
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
    </div>
  );
};
