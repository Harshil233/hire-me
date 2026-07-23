import { Link } from 'react-router-dom';

import { MapPinIcon } from '@/components/icons';
import { JOB_TYPE_LABELS, candidateDetailPath } from '@/config/constants';
import { CandidateAvatar } from './CandidateAvatar';
import { ResumeButton } from './ResumeButton';
import type { Candidate } from '../schemas/candidate.schema';

export interface CandidateCardProps {
  readonly candidate: Candidate;
}

const SKILLS_SHOWN = 6;

export const CandidateCard = ({ candidate }: CandidateCardProps): React.JSX.Element => {
  const extraSkills = candidate.skills.length - SKILLS_SHOWN;

  return (
    <article className="surface-card surface-card-interactive relative flex gap-4 p-5">
      <CandidateAvatar fullName={candidate.fullName} />

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold text-fg">
          {/* Stretched link: the whole card is the target, but only this is in the tab order. */}
          <Link to={candidateDetailPath(candidate.userId)} className="after:absolute after:inset-0">
            {candidate.fullName}
          </Link>
        </h3>

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
              <li key={skill} className="chip">
                {skill}
              </li>
            ))}
            {extraSkills > 0 && (
              <li className="px-1 py-1 text-xs font-medium text-fg-subtle">+{extraSkills} more</li>
            )}
          </ul>
        )}

        {candidate.preferredLocations.length > 0 && (
          <p className="mt-3 text-xs text-fg-subtle">
            Open to {candidate.preferredLocations.join(', ')}
          </p>
        )}
      </div>

      {candidate.resumeFileId !== undefined && (
        // Above the stretched link, so the download does not navigate instead.
        <div className="relative z-10 shrink-0 self-start">
          <ResumeButton fileId={candidate.resumeFileId} candidateName={candidate.fullName} />
        </div>
      )}
    </article>
  );
};
