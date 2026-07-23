import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { useFileObjectUrl } from '../hooks/useFileObjectUrl';
import { useProfile } from '../hooks/useProfile';

export interface NavAvatarProps {
  /** Fallback while the profile is still loading, or if it fails. */
  readonly email: string;
  readonly className?: string;
}

/**
 * The signed-in user's own face in the header.
 *
 * It reads the profile rather than the session, because the session carries only an id,
 * an email and a role — which is why this used to show initials even after a photo had
 * been uploaded. The query is the same one the profile screen uses, so it is served from
 * cache and refreshes the moment a new picture is saved.
 */
export const NavAvatar = ({ email, className }: NavAvatarProps): React.JSX.Element => {
  const profile = useProfile();
  const view = profile.data;

  const picture = view?.profile.profilePicFileId;
  const avatarUrl = useFileObjectUrl(picture);

  const label =
    view === undefined
      ? email.slice(0, 2).toUpperCase()
      : initials({ firstName: view.profile.firstName, lastName: view.profile.lastName }) ||
        email.slice(0, 2).toUpperCase();

  const shared = cn(
    'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-highlight-soft font-semibold text-highlight-text',
    className,
  );

  if (avatarUrl === null) {
    return (
      <span aria-hidden="true" className={shared}>
        {label}
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={shared}>
      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
    </span>
  );
};
