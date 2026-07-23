import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from '@/config/constants';

const TONES: Readonly<Record<ApplicationStatus, string>> = Object.freeze({
  applied: 'bg-info-soft text-info',
  shortlisted: 'bg-success-soft text-success',
  rejected: 'bg-surface-hover text-fg-muted',
  withdrawn: 'bg-warning-soft text-warning',
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
