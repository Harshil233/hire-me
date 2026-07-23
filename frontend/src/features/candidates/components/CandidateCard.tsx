import { Link } from 'react-router-dom';

import { MapPinIcon } from '@/components/icons';
import { JOB_TYPE_LABELS, candidateDetailPath } from '@/config/constants';
import { CandidateAvatar } from './CandidateAvatar';
import { ResumeButton } from './ResumeButton';
import type { Candidate } from '../schemas/candidate.schema';

export interface CandidateCardProps {
  readonly candidate: Candidate;
}

const SKILLS_SHOWN = 4;

/**
 * One person, sized for scanning a page of them: the name leads, the two facts that
 * decide a shortlist (where they are, what they are open to) sit right under it, and the
 * skills are a quiet texture rather than a second row of headlines.
 */
export const CandidateCard = ({ candidate }: CandidateCardProps): React.JSX.Element => {
  const extraSkills = candidate.skills.length - SKILLS_SHOWN;

  return (
    <article className="surface-card surface-card-interactive relative flex gap-4 p-4 sm:p-5">
      <CandidateAvatar fullName={candidate.fullName} />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 truncate text-[1.0625rem] leading-tight font-semibold tracking-[-0.01em] text-fg">
            {/* Stretched link: the whole card is the target, but only this is in the tab order. */}
            <Link
              to={candidateDetailPath(candidate.userId)}
              className="transition-colors after:absolute after:inset-0 hover:text-highlight-text"
            >
              {candidate.fullName}
            </Link>
          </h3>

          {candidate.resumeFileId !== undefined && (
            // Above the stretched link, so opening the resume does not navigate instead.
            <div className="relative z-10 shrink-0">
              <ResumeButton fileId={candidate.resumeFileId} candidateName={candidate.fullName} />
            </div>
          )}
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <MapPinIcon className="h-4 w-4 text-fg-subtle" />
            {candidate.currentLocation ?? 'Location not shared'}
          </span>
          {candidate.jobTypes.length > 0 && (
            <>
              <span aria-hidden="true" className="text-fg-subtle">
                ·
              </span>
              <span>{candidate.jobTypes.map((type) => JOB_TYPE_LABELS[type]).join(' · ')}</span>
            </>
          )}
        </div>

        {candidate.skills.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {candidate.skills.slice(0, SKILLS_SHOWN).map((skill) => (
              <li key={skill} className="chip">
                {skill}
              </li>
            ))}
            {extraSkills > 0 && (
              <li className="numeric self-center px-1 text-xs text-fg-subtle">+{extraSkills}</li>
            )}
          </ul>
        )}

        {candidate.preferredLocations.length > 0 && (
          <p className="mt-2.5 truncate text-xs text-fg-subtle">
            Open to {candidate.preferredLocations.join(', ')}
          </p>
        )}
      </div>
    </article>
  );
};
