import { Button } from '@/components/Button';
import { APPLICATION_STATUSES_UI } from '../constants';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import type { Applicant } from '../schemas/application.schema';

export interface ApplicantRowProps {
  readonly applicant: Applicant;
  readonly isUpdating: boolean;
  readonly onShortlist: () => void;
  readonly onReject: () => void;
}

/**
 * One applicant card. A withdrawn application is read-only: the candidate has taken
 * themselves out, so neither action applies any more.
 */
export const ApplicantRow = ({
  applicant,
  isUpdating,
  onShortlist,
  onReject,
}: ApplicantRowProps): React.JSX.Element => {
  const isClosed = applicant.status === APPLICATION_STATUSES_UI.WITHDRAWN;

  return (
    <article className="surface-card px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-fg">
            {applicant.candidate.fullName}
          </h3>
          {applicant.candidate.currentLocation !== undefined && (
            <p className="mt-0.5 text-sm text-fg-muted">
              {applicant.candidate.currentLocation}
            </p>
          )}
        </div>
        <ApplicationStatusBadge status={applicant.status} />
      </div>

      {applicant.candidate.skills.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {applicant.candidate.skills.map((skill) => (
            <li
              key={skill}
              className="rounded-full bg-surface-inset px-2.5 py-0.5 text-xs font-medium text-fg-muted"
            >
              {skill}
            </li>
          ))}
        </ul>
      )}

      {applicant.coverNote !== undefined && (
        <p className="mt-3 whitespace-pre-line text-sm text-fg">{applicant.coverNote}</p>
      )}

      {!isClosed && (
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="secondary" isLoading={isUpdating} onClick={onShortlist}>
            Shortlist
          </Button>
          <Button size="sm" variant="secondary" isLoading={isUpdating} onClick={onReject}>
            Reject
          </Button>
        </div>
      )}
    </article>
  );
};
