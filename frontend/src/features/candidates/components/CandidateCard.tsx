import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { MapPinIcon } from '@/components/icons';
import { JOB_TYPE_LABELS, candidateDetailPath } from '@/config/constants';
import { CandidateAvatar } from './CandidateAvatar';
import { ResumeButton } from './ResumeButton';
import type { Candidate } from '../schemas/candidate.schema';

export interface CandidateCardProps {
  readonly candidate: Candidate;
  /** Rendered beside the avatar — the selection tick when a campaign is being built. */
  readonly selection?: ReactNode;
}

const SKILLS_SHOWN = 4;

/**
 * One person, sized for scanning a page of them: the name leads, the two facts that
 * decide a shortlist sit under it, and the resume actions sit on their own row at the
 * bottom. They used to share the top line with the name, which squeezed it to an
 * ellipsis on anything narrower than a wide desktop.
 */
export const CandidateCard = ({ candidate, selection }: CandidateCardProps): React.JSX.Element => {
  const extraSkills = candidate.skills.length - SKILLS_SHOWN;

  return (
    <article className="surface-card surface-card-interactive relative flex flex-col p-4 sm:p-5">
      <div className="flex gap-4">
        {selection !== undefined && <div className="relative z-10 pt-1">{selection}</div>}

        <CandidateAvatar
          fullName={candidate.fullName}
          profilePicFileId={candidate.profilePicFileId}
        />

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[1.0625rem] leading-tight font-semibold tracking-[-0.01em] text-fg">
            {/* Stretched link: the whole card is the target, but only this is in the tab order. */}
            <Link
              to={candidateDetailPath(candidate.userId)}
              className="transition-colors after:absolute after:inset-0 hover:text-highlight-text"
            >
              {candidate.fullName}
            </Link>
          </h3>

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
      </div>

      {candidate.resumeFileId !== undefined && (
        // Its own row, and above the stretched link so opening the file does not navigate.
        <div className="relative z-10 mt-3.5 border-t border-border pt-3">
          <ResumeButton fileId={candidate.resumeFileId} candidateName={candidate.fullName} />
        </div>
      )}
    </article>
  );
};
