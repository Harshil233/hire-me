import { JOB_STATUS_LABELS, type JobStatus } from '@/config/constants';

const TONES: Readonly<Record<JobStatus, string>> = Object.freeze({
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-amber-100 text-amber-700',
});

export interface JobStatusBadgeProps {
  readonly status: JobStatus;
}

export const JobStatusBadge = ({ status }: JobStatusBadgeProps): React.JSX.Element => (
  <span
    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[status]}`}
    data-testid="job-status"
  >
    {JOB_STATUS_LABELS[status]}
  </span>
);
