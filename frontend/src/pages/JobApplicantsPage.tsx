import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Alert } from '@/components/Alert';
import { EmptyState } from '@/components/Card';
import { Pagination } from '@/components/Pagination';
import { Skeleton } from '@/components/Skeleton';
import { ROUTES } from '@/config/constants';
import { ApplicantRow } from '@/features/applications/components/ApplicantRow';
import { APPLICATION_STATUSES_UI } from '@/features/applications/constants';
import {
  useChangeApplicationStatus,
  useJobApplicants,
} from '@/features/applications/hooks/useApplications';
import type { ApplicationFilters } from '@/features/applications/schemas/application.schema';
import { useJob } from '@/features/jobs/hooks/useJobs';

export const JobApplicantsPage = (): React.JSX.Element => {
  const { id = '' } = useParams<{ id: string }>();
  const [filters, setFilters] = useState<ApplicationFilters>({ page: 1 });

  const job = useJob(id);
  const applicants = useJobApplicants(id, filters);
  const changeStatus = useChangeApplicationStatus();

  return (
    <div className="space-y-5">
      <Link to={ROUTES.HR_JOBS} className="text-sm font-medium text-brand-text hover:underline">
        ← Back to your postings
      </Link>

      <header>
        <h1 className="text-xl font-semibold text-fg">
          {job.isSuccess ? `Applicants for ${job.data.title}` : 'Applicants'}
        </h1>
        {applicants.isSuccess && (
          <p className="mt-0.5 text-sm text-fg-muted">
            {applicants.data.pagination.total}{' '}
            {applicants.data.pagination.total === 1 ? 'application' : 'applications'}
          </p>
        )}
      </header>

      {applicants.isPending && (
        <div className="space-y-3" data-testid="applicants-loading">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      )}

      {applicants.isError && <Alert tone="error">{applicants.error.message}</Alert>}
      {changeStatus.isError && <Alert tone="error">{changeStatus.error.message}</Alert>}

      {applicants.isSuccess && applicants.data.applications.length === 0 && (
        <EmptyState
          title="No applications yet"
          description="Once candidates apply to this listing they will appear here."
        />
      )}

      {applicants.isSuccess &&
        applicants.data.applications.map((applicant) => (
          <ApplicantRow
            key={applicant.id}
            applicant={applicant}
            isUpdating={changeStatus.isPending && changeStatus.variables.id === applicant.id}
            onShortlist={() => {
              changeStatus.mutate({
                id: applicant.id,
                status: APPLICATION_STATUSES_UI.SHORTLISTED,
              });
            }}
            onReject={() => {
              changeStatus.mutate({
                id: applicant.id,
                status: APPLICATION_STATUSES_UI.REJECTED,
              });
            }}
          />
        ))}

      {applicants.isSuccess && (
        <Pagination
          page={applicants.data.pagination.page}
          totalPages={applicants.data.pagination.totalPages}
          total={applicants.data.pagination.total}
          onChange={(page) => {
            setFilters({ ...filters, page });
          }}
        />
      )}
    </div>
  );
};
