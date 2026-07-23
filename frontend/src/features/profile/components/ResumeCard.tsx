import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { Card, EmptyState } from '@/components/Card';
import { FILE_KINDS } from '@/config/constants';
import { useFileObjectUrl } from '../hooks/useFileObjectUrl';
import { useUpdateProfile, useUploadFile } from '../hooks/useProfile';
import { FileUploadButton } from './FileUploadButton';

export interface ResumeCardProps {
  readonly resumeFileId?: string | undefined;
}

export const ResumeCard = ({ resumeFileId }: ResumeCardProps): React.JSX.Element => {
  const upload = useUploadFile();
  const updateProfile = useUpdateProfile();
  const resumeUrl = useFileObjectUrl(resumeFileId);

  const handleSelect = (file: File): void => {
    upload.mutate(
      { kind: FILE_KINDS.RESUME, file },
      {
        onSuccess: (uploaded) => {
          updateProfile.mutate({ resumeFileId: uploaded.id });
        },
      },
    );
  };

  const isBusy = upload.isPending || updateProfile.isPending;

  return (
    <Card
      id="section-resume"
      title="Resume"
      description="PDF or Word document, up to 5MB."
      actions={
        resumeFileId !== undefined && (
          <FileUploadButton
            kind={FILE_KINDS.RESUME}
            label="Replace"
            isUploading={isBusy}
            onSelect={handleSelect}
          />
        )
      }
    >
      {resumeFileId === undefined ? (
        <EmptyState
          title="No resume uploaded yet"
          description="Employers are far more likely to respond when one is attached."
          action={
            <FileUploadButton
              kind={FILE_KINDS.RESUME}
              label="Upload resume"
              variant="primary"
              isUploading={isBusy}
              onSelect={handleSelect}
            />
          }
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-fg">Resume attached</p>
            <p className="text-xs text-fg-muted">Visible to employers you apply to.</p>
          </div>

          {resumeUrl !== null && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                window.open(resumeUrl, '_blank', 'noopener');
              }}
            >
              View
            </Button>
          )}
        </div>
      )}

      {upload.isError && (
        <Alert tone="error" className="mt-4">
          {upload.error.message}
        </Alert>
      )}
    </Card>
  );
};
