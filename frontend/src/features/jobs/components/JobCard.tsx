import { Link } from 'react-router-dom';

import {
  JOB_ROLE_LABELS,
  JOB_TYPE_LABELS,
  WORK_MODE_LABELS,
  jobDetailPath,
} from '@/config/constants';
import { JobStatusBadge } from './JobStatusBadge';
import { formatCtcRange, formatExperienceRange } from '../utils/job.format';
import type { Job } from '../schemas/job.schema';

export interface JobCardProps {
  readonly job: Job;
  /** HR sees the lifecycle state of their own postings; candidates do not. */
  readonly showStatus?: boolean;
}

export const JobCard = ({ job, showStatus = false }: JobCardProps): React.JSX.Element => {
  const ctc = formatCtcRange(job.ctcMin, job.ctcMax);
  const experience = formatExperienceRange(job.experienceMinYears, job.experienceMaxYears);

  return (
    <article className="surface-card px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900">
            <Link to={jobDetailPath(job.id)} className="hover:text-brand-700 hover:underline">
              {job.title}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">{job.company.name}</p>
        </div>
        {showStatus && <JobStatusBadge status={job.status} />}
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
        <div className="flex gap-1.5">
          <dt className="text-slate-400">Role</dt>
          <dd>{JOB_ROLE_LABELS[job.role]}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-slate-400">Type</dt>
          <dd>{JOB_TYPE_LABELS[job.jobType]}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-slate-400">Mode</dt>
          <dd>{WORK_MODE_LABELS[job.workMode]}</dd>
        </div>
        {experience !== '' && (
          <div className="flex gap-1.5">
            <dt className="text-slate-400">Experience</dt>
            <dd>{experience}</dd>
          </div>
        )}
        {ctc !== '' && (
          <div className="flex gap-1.5">
            <dt className="text-slate-400">CTC</dt>
            <dd>{ctc}</dd>
          </div>
        )}
      </dl>

      {job.locations.length > 0 && (
        <p className="mt-2 text-sm text-slate-500">{job.locations.join(' · ')}</p>
      )}

      {job.skills.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {job.skills.map((skill) => (
            <li
              key={skill}
              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
            >
              {skill}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
};
