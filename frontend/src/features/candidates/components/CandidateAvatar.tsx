import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

export type CandidateAvatarSize = 'md' | 'lg';

const SIZE_CLASSES: Record<CandidateAvatarSize, string> = {
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-lg',
};

export interface CandidateAvatarProps {
  readonly fullName: string;
  readonly size?: CandidateAvatarSize;
}

/**
 * A candidate's initials, in iris. The pool only ever sends a display name, so the parts
 * are split back out here rather than at each call site.
 */
export const CandidateAvatar = ({
  fullName,
  size = 'md',
}: CandidateAvatarProps): React.JSX.Element => {
  const [first = '', ...rest] = fullName.split(' ');

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-highlight-soft font-semibold text-highlight-text',
        SIZE_CLASSES[size],
      )}
    >
      {initials({ firstName: first, lastName: rest[rest.length - 1] ?? '' }) || '?'}
    </span>
  );
};
