import { Alert } from '@/components/Alert';
import { CompletionRing } from '@/components/CompletionRing';
import { FILE_KINDS } from '@/config/constants';
import { fullName, initials } from '@/lib/format';
import { useUpdateProfile, useUploadFile } from '../hooks/useProfile';
import { useFileObjectUrl } from '../hooks/useFileObjectUrl';
import type { ProfileCompletion } from '../schemas/profile.schema';
import { FileUploadButton } from './FileUploadButton';

export interface ProfileHeaderProps {
  readonly firstName: string;
  readonly middleName?: string | undefined;
  readonly lastName: string;
  readonly email: string;
  readonly subtitle?: string | undefined;
  readonly profilePicFileId?: string | undefined;
  readonly completion: ProfileCompletion;
}

/** Identity, avatar and the completion ring with a "what's missing" checklist. */
export const ProfileHeader = ({
  firstName,
  middleName,
  lastName,
  email,
  subtitle,
  profilePicFileId,
  completion,
}: ProfileHeaderProps): React.JSX.Element => {
  const upload = useUploadFile();
  const updateProfile = useUpdateProfile();
  const avatarUrl = useFileObjectUrl(profilePicFileId);

  const handleSelect = (file: File): void => {
    upload.mutate(
      { kind: FILE_KINDS.PROFILE_PIC, file },
      {
        onSuccess: (uploaded) => {
          updateProfile.mutate({ profilePicFileId: uploaded.id });
        },
      },
    );
  };

  const isBusy = upload.isPending || updateProfile.isPending;

  return (
    <section className="surface-card p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex items-center gap-4">
          <div className="relative">
            {avatarUrl === null ? (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-text">
                {initials({ firstName, lastName }) || '?'}
              </div>
            ) : (
              <img
                src={avatarUrl}
                alt=""
                className="h-20 w-20 rounded-full object-cover ring-1 ring-slate-200"
              />
            )}
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-fg">
              {fullName({ firstName, middleName, lastName })}
            </h1>
            <p className="truncate text-sm text-fg-muted">{email}</p>
            {subtitle !== undefined && subtitle !== '' && (
              <p className="mt-0.5 truncate text-sm font-medium text-brand-text">{subtitle}</p>
            )}
            <div className="mt-3">
              <FileUploadButton
                kind={FILE_KINDS.PROFILE_PIC}
                label={profilePicFileId === undefined ? 'Add photo' : 'Change photo'}
                isUploading={isBusy}
                onSelect={handleSelect}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
          <div className="order-2 max-w-sm sm:order-1">
            <p className="text-sm font-medium text-fg">
              {completion.percentage === 100
                ? 'Your profile is complete 🎉'
                : 'Finish your profile to stand out'}
            </p>

            {completion.missing.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {completion.missing.slice(0, 6).map((item) => (
                  <li key={item.key}>
                    <a
                      href={`#section-${item.key}`}
                      className="inline-block rounded-md bg-surface-inset px-2 py-1 text-xs font-medium text-fg-muted transition hover:bg-surface-hover hover:text-fg"
                    >
                      + {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="order-1 sm:order-2">
            <CompletionRing percentage={completion.percentage} />
          </div>
        </div>
      </div>

      {upload.isError && (
        <Alert tone="error" className="mt-4">
          {upload.error.message}
        </Alert>
      )}
    </section>
  );
};
