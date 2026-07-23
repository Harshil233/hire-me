import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { DownloadIcon } from '@/components/icons';
import { useFileDownload } from '@/hooks/useFileDownload';
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

/** Downloads a candidate's résumé. Fetches only when asked, never on render. */
export const ResumeButton = ({
  fileId,
  candidateName,
  size = 'sm',
  api,
}: ResumeButtonProps): React.JSX.Element => {
  const { download, isDownloading, error } = useFileDownload(api);

  return (
    <div>
      <Button
        size={size}
        variant="secondary"
        isLoading={isDownloading}
        leadingIcon={<DownloadIcon className="h-4 w-4" />}
        onClick={() => {
          void download(fileId, fileNameFor(candidateName));
        }}
      >
        Résumé
      </Button>

      {error !== null && (
        <Alert tone="error" className="mt-2">
          {error}
        </Alert>
      )}
    </div>
  );
};
