import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import {
  JOB_ROLE_LABELS,
  JOB_TYPE_LABELS,
  ROLES,
  ROUTES,
  WORK_MODE_LABELS,
} from '@/config/constants';
import { SimilarJobs } from '@/features/jobs/components/SimilarJobs';
import { ApplyModal } from '@/features/applications/components/ApplyModal';
import { useApply } from '@/features/applications/hooks/useApplications';
import { JobStatusBadge } from '@/features/jobs/components/JobStatusBadge';
import { useJob } from '@/features/jobs/hooks/useJobs';
import { formatCtcRange, formatExperienceRange } from '@/features/jobs/utils/job.format';
import { useAuthStore } from '@/store/auth.store';

const Detail = ({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}): React.JSX.Element | null =>
  value === '' ? null : (
    <div>
      <dt className="text-xs uppercase tracking-wide text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 text-sm text-fg">{value}</dd>
    </div>
  );

export const JobDetailPage = (): React.JSX.Element => {
  const { id = '' } = useParams<{ id: string }>();
  const query = useJob(id);
  const role = useAuthStore((state) => state.user?.role);
  const apply = useApply();
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  if (query.isPending) {
    return <Skeleton className="h-64" />;
  }

  if (query.isError) {
    return (
      <div className="space-y-4">
        <Alert tone="error">{query.error.message}</Alert>
        <Link to={ROUTES.JOBS} className="text-sm font-medium text-brand-text hover:underline">
          Back to jobs
        </Link>
      </div>
    );
  }

  const job = query.data;
  // Only a candidate can apply, and only while the listing is live.
  const canApply = role === ROLES.CANDIDATE && job.status === 'published';

  return (
    <div className="space-y-4">
      <Link to={ROUTES.JOBS} className="text-sm font-medium text-brand-text hover:underline">
        ← Back to jobs
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-fg">{job.title}</h1>
            <p className="mt-1 text-sm text-fg-muted">{job.company.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <JobStatusBadge status={job.status} />
            {canApply &&
              (hasApplied ? (
                <span className="text-sm font-medium text-success">Application sent</span>
              ) : (
                <Button
                  onClick={() => {
                    apply.reset();
                    setIsApplyOpen(true);
                  }}
                >
                  Apply
                </Button>
              ))}
          </div>
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Role" value={JOB_ROLE_LABELS[job.role]} />
          <Detail label="Job type" value={JOB_TYPE_LABELS[job.jobType]} />
          <Detail label="Work mode" value={WORK_MODE_LABELS[job.workMode]} />
          <Detail
            label="Experience"
            value={formatExperienceRange(job.experienceMinYears, job.experienceMaxYears)}
          />
          <Detail label="CTC" value={formatCtcRange(job.ctcMin, job.ctcMax)} />
          <Detail label="Locations" value={job.locations.join(' · ')} />
        </dl>

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-fg">About this role</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-fg">
            {job.description}
          </p>
        </div>

        {job.skills.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-fg">Skills</h2>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {job.skills.map((skill) => (
                <li key={skill} className="chip chip-sm">
                  {skill}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <SimilarJobs job={{ id: job.id, role: job.role }} />

      {isApplyOpen && (
        <ApplyModal
          isOpen={isApplyOpen}
          jobTitle={job.title}
          isApplying={apply.isPending}
          error={apply.error}
          onClose={() => {
            setIsApplyOpen(false);
          }}
          onSubmit={(values) => {
            apply.mutate(
              { jobId: job.id, values },
              {
                onSuccess: () => {
                  setIsApplyOpen(false);
                  setHasApplied(true);
                },
              },
            );
          }}
        />
      )}
    </div>
  );
};
