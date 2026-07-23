import { useFileObjectUrl } from '@/features/profile/hooks/useFileObjectUrl';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

export type CandidateAvatarSize = 'md' | 'lg';

const SIZE_CLASSES: Record<CandidateAvatarSize, string> = {
  md: 'h-12 w-12 text-sm',
  lg: 'h-16 w-16 text-lg',
};

export interface CandidateAvatarProps {
  readonly fullName: string;
  /** Shown when the candidate has uploaded one; initials stand in until then. */
  readonly profilePicFileId?: string | undefined;
  readonly size?: CandidateAvatarSize;
}

/**
 * A candidate's photo, or their initials in iris. The pool only ever sends a display
 * name, so the parts are split back out here rather than at each call site.
 */
export const CandidateAvatar = ({
  fullName,
  profilePicFileId,
  size = 'md',
}: CandidateAvatarProps): React.JSX.Element => {
  const [first = '', ...rest] = fullName.split(' ');
  const photoUrl = useFileObjectUrl(profilePicFileId);

  const className = cn(
    'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-highlight-soft font-semibold text-highlight-text',
    SIZE_CLASSES[size],
  );

  if (photoUrl !== null) {
    return (
      <span aria-hidden="true" className={className}>
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={className}>
      {initials({ firstName: first, lastName: rest[rest.length - 1] ?? '' }) || '?'}
    </span>
  );
};
