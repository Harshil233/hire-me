import { MapPinIcon } from '@/components/icons';
import { JOB_TYPE_LABELS } from '@/config/constants';
import { initials } from '@/lib/format';
import type { Candidate } from '../schemas/candidate.schema';

export interface CandidateCardProps {
  readonly candidate: Candidate;
}

const SKILLS_SHOWN = 6;

export const CandidateCard = ({ candidate }: CandidateCardProps): React.JSX.Element => {
  const [first = '', ...rest] = candidate.fullName.split(' ');
  const extraSkills = candidate.skills.length - SKILLS_SHOWN;

  return (
    <article className="surface-card surface-card-interactive flex gap-4 p-5">
      <span
        aria-hidden="true"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand-text"
      >
        {initials({ firstName: first, lastName: rest[rest.length - 1] ?? '' })}
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold text-fg">{candidate.fullName}</h3>

        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
          {candidate.currentLocation !== undefined && (
            <span className="inline-flex items-center gap-1.5">
              <MapPinIcon className="h-4 w-4 text-fg-subtle" />
              {candidate.currentLocation}
            </span>
          )}
          {candidate.jobTypes.length > 0 && (
            <span>{candidate.jobTypes.map((type) => JOB_TYPE_LABELS[type]).join(' · ')}</span>
          )}
        </div>

        {candidate.skills.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {candidate.skills.slice(0, SKILLS_SHOWN).map((skill) => (
              <li
                key={skill}
                className="rounded-full bg-surface-inset px-2.5 py-1 text-xs font-medium text-fg-muted"
              >
                {skill}
              </li>
            ))}
            {extraSkills > 0 && (
              <li className="px-1 py-1 text-xs font-medium text-fg-subtle">
                +{extraSkills} more
              </li>
            )}
          </ul>
        )}

        {candidate.preferredLocations.length > 0 && (
          <p className="mt-3 text-xs text-fg-subtle">
            Open to {candidate.preferredLocations.join(', ')}
          </p>
        )}
      </div>
    </article>
  );
};
