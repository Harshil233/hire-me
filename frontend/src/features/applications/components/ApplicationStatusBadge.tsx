import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from '@/config/constants';

const TONES: Readonly<Record<ApplicationStatus, string>> = Object.freeze({
  applied: 'bg-sky-100 text-sky-700',
  shortlisted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-slate-200 text-slate-600',
  withdrawn: 'bg-amber-100 text-amber-700',
});

export interface ApplicationStatusBadgeProps {
  readonly status: ApplicationStatus;
}

export const ApplicationStatusBadge = ({
  status,
}: ApplicationStatusBadgeProps): React.JSX.Element => (
  <span
    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[status]}`}
    data-testid="application-status"
  >
    {APPLICATION_STATUS_LABELS[status]}
  </span>
);
