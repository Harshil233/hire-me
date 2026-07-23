import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { ClockIcon, MapPinIcon } from '@/components/icons';
import {
  JOB_ROLE_LABELS,
  JOB_TYPE_LABELS,
  WORK_MODE_LABELS,
  jobDetailPath,
} from '@/config/constants';
import { JobStatusBadge } from './JobStatusBadge';
import { PayBand } from './PayBand';
import type { PayScale } from '../utils/pay-scale';
import { formatCtcRange, formatExperienceRange } from '../utils/job.format';
import type { Job } from '../schemas/job.schema';

export interface JobCardProps {
  readonly job: Job;
  /** Shared across the page so every band is measured on the same axis. */
  readonly scale: PayScale;
  /** HR sees the lifecycle state of their own postings; candidates do not. */
  readonly showStatus?: boolean;
  /** Rendered in the card's own action row, so it never dangles underneath. */
  readonly actions?: ReactNode;
}

const SKILLS_SHOWN = 4;

export const JobCard = ({
  job,
  scale,
  showStatus = false,
  actions,
}: JobCardProps): React.JSX.Element => {
  const ctc = formatCtcRange(job.ctcMin, job.ctcMax);
  const experience = formatExperienceRange(job.experienceMinYears, job.experienceMaxYears);
  const extraSkills = job.skills.length - SKILLS_SHOWN;

  return (
    <article className="surface-card surface-card-interactive overflow-hidden">
      <div className="p-5">
        {/* Title and pay share the top line: the two things a scan is looking for. */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-[1.0625rem] leading-snug font-semibold text-fg">
              <Link
                to={jobDetailPath(job.id)}
                className="transition-colors before:absolute before:inset-0 before:content-[''] hover:text-accent"
              >
                {job.title}
              </Link>
            </h3>
            <p className="mt-1 truncate text-sm text-fg-muted">
              {job.company.name}
              <span className="mx-1.5 text-fg-subtle">·</span>
              {JOB_ROLE_LABELS[job.role]}
            </p>
          </div>

          <div className="shrink-0 text-right">
            {ctc === '' ? (
              <span className="text-sm text-fg-subtle">Not disclosed</span>
            ) : (
              <span className="numeric text-sm font-medium text-fg">{ctc}</span>
            )}
            <p className="eyebrow mt-1">{JOB_TYPE_LABELS[job.jobType]}</p>
          </div>
        </div>

        <div className="mt-4">
          <PayBand
            ctcMin={job.ctcMin}
            ctcMax={job.ctcMax}
            scale={scale}
            label={ctc === '' ? 'Pay not disclosed' : `Pay range ${ctc}`}
          />
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-muted">
          {job.locations.length > 0 && (
            <span className="inline-flex items-center gap-1.5">
              <MapPinIcon className="h-4 w-4 text-fg-subtle" />
              {job.locations.join(', ')}
              <span className="text-fg-subtle">·</span>
              {WORK_MODE_LABELS[job.workMode]}
            </span>
          )}
          {experience !== '' && (
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon className="h-4 w-4 text-fg-subtle" />
              <span className="numeric">{experience}</span>
            </span>
          )}
          {showStatus && <JobStatusBadge status={job.status} />}
        </div>

        {job.skills.length > 0 && (
          <ul className="mt-3.5 flex flex-wrap gap-1.5">
            {job.skills.slice(0, SKILLS_SHOWN).map((skill) => (
              <li
                key={skill}
                className="rounded border border-border bg-surface-inset px-2 py-0.5 text-xs text-fg-muted"
              >
                {skill}
              </li>
            ))}
            {extraSkills > 0 && (
              <li className="numeric px-1 py-0.5 text-xs text-fg-subtle">+{extraSkills}</li>
            )}
          </ul>
        )}
      </div>

      {actions !== undefined && (
        // `relative` lifts the actions above the title's full-card click target.
        <div className="relative flex flex-wrap justify-end gap-2 border-t border-border bg-surface-inset px-5 py-3">
          {actions}
        </div>
      )}
    </article>
  );
};
