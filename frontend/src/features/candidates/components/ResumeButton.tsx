import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { DownloadIcon, EyeIcon } from '@/components/icons';
import { useProtectedFile } from '@/hooks/useProtectedFile';
import type { IFileApi } from '@/services/file.api';

export interface ResumeButtonProps {
  readonly fileId: string;
  /** Used to name the saved file, so a folder of résumés stays readable. */
  readonly candidateName: string;
  readonly size?: 'sm' | 'md';
  readonly api?: IFileApi;
}

const fileNameFor = (candidateName: string): string =>
  `${candidateName.trim().replace(/\s+/g, '-').toLowerCase()}-resume.pdf`;

/**
 * Read or keep a candidate's résumé. Viewing comes first: screening someone rarely means
 * wanting the file, it means wanting to read it. Both fetch only when asked.
 */
export const ResumeButton = ({
  fileId,
  candidateName,
  size = 'sm',
  api,
}: ResumeButtonProps): React.JSX.Element => {
  const { view, download, isBusy, error } = useProtectedFile(api);

  return (
    <div>
      <div className="flex gap-2">
        <Button
          size={size}
          variant="secondary"
          isLoading={isBusy}
          leadingIcon={<EyeIcon className="h-4 w-4" />}
          onClick={() => {
            void view(fileId);
          }}
        >
          View résumé
        </Button>

        <Button
          size={size}
          variant="ghost"
          disabled={isBusy}
          leadingIcon={<DownloadIcon className="h-4 w-4" />}
          aria-label={`Download ${candidateName}’s résumé`}
          onClick={() => {
            void download(fileId, fileNameFor(candidateName));
          }}
        >
          Download
        </Button>
      </div>

      {error !== null && (
        <Alert tone="error" className="mt-2">
          {error}
        </Alert>
      )}
    </div>
  );
};
