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
import { ArrowLeftIcon, CheckIcon } from '@/components/icons';
import { CompanyLinks } from '@/features/jobs/components/CompanyLinks';
import { JobBulletSection } from '@/features/jobs/components/JobBulletSection';
import { SimilarJobs } from '@/features/jobs/components/SimilarJobs';
import { ApplyModal } from '@/features/applications/components/ApplyModal';
import { useAppliedJobIds, useApply } from '@/features/applications/hooks/useApplications';
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
  const appliedJobIds = useAppliedJobIds(role === ROLES.CANDIDATE);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  // Held locally as well, so the button changes the moment the application lands rather
  // than when the refetch it triggered comes back.
  const [justApplied, setJustApplied] = useState(false);

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
  // Applying twice is refused by the server, so it is never offered as if it were not.
  const hasApplied = justApplied || (appliedJobIds.data?.has(job.id) ?? false);

  return (
    <div className="space-y-4">
      <Link
        to={ROUTES.JOBS}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition hover:text-fg"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to jobs
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <h1 className="text-2xl leading-tight font-semibold tracking-[-0.02em] text-fg">
              {job.title}
            </h1>
            <p className="mt-1 text-sm text-fg-muted">{job.company.name}</p>
            <div className="mt-3">
              <CompanyLinks company={job.company} />
            </div>
          </div>

          {/* The badge is a label and the button is an action; they read as one row only
              if the badge sits above rather than beside it. */}
          <div className="flex shrink-0 flex-col items-end gap-3">
            <JobStatusBadge status={job.status} />
            {canApply &&
              (hasApplied ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 text-sm font-medium text-success">
                  <CheckIcon className="h-4 w-4" />
                  Applied
                </span>
              ) : (
                <Button
                  size="lg"
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

        <JobBulletSection title="What you get" items={job.highlights} />
        <JobBulletSection title="Responsibilities" items={job.responsibilities} />
        <JobBulletSection title="Qualifications & skills" items={job.qualifications} />

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
                  setJustApplied(true);
                },
              },
            );
          }}
        />
      )}
    </div>
  );
};
