import { JOB_TYPE_LABELS, type JobType } from '@/config/constants';
import { cn } from '@/lib/cn';

/**
 * Employment type, tinted. It is the fact a scan sorts by first — an internship and a
 * permanent role are not near-substitutes — so it earns a colour rather than another
 * line of grey uppercase text.
 */
const TONE_CLASSES: Record<JobType, string> = {
  full_time: 'bg-tone-permanent-soft text-tone-permanent',
  part_time: 'bg-tone-partial-soft text-tone-partial',
  contract: 'bg-tone-temporary-soft text-tone-temporary',
  internship: 'bg-tone-entry-soft text-tone-entry',
  freelance: 'bg-tone-independent-soft text-tone-independent',
};

export interface JobTypeBadgeProps {
  readonly jobType: JobType;
  readonly className?: string;
}

export const JobTypeBadge = ({ jobType, className }: JobTypeBadgeProps): React.JSX.Element => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
      TONE_CLASSES[jobType],
      className,
    )}
  >
    {JOB_TYPE_LABELS[jobType]}
  </span>
);
