import { useRef, useState } from 'react';

import { Button } from '@/components/Button';
import { ACCEPTED_FILE_TYPES, MAX_UPLOAD_BYTES, type FileKind } from '@/config/constants';

export interface FileUploadButtonProps {
  readonly kind: FileKind;
  readonly label: string;
  readonly isUploading: boolean;
  readonly onSelect: (file: File) => void;
  readonly variant?: 'primary' | 'secondary';
}

const megabytes = (bytes: number): string => `${Math.round(bytes / 1_048_576)}MB`;

/**
 * Hidden file input behind a styled button, with the size check performed before the
 * request so an oversized file never leaves the browser.
 */
export const FileUploadButton = ({
  kind,
  label,
  isUploading,
  onSelect,
  variant = 'secondary',
}: FileUploadButtonProps): React.JSX.Element => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES[kind]}
        className="sr-only"
        aria-label={label}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';

          if (file === undefined) {
            return;
          }

          if (file.size > MAX_UPLOAD_BYTES) {
            setLocalError(`Choose a file smaller than ${megabytes(MAX_UPLOAD_BYTES)}`);
            return;
          }

          setLocalError(null);
          onSelect(file);
        }}
      />

      <Button
        size="sm"
        variant={variant}
        isLoading={isUploading}
        onClick={() => {
          inputRef.current?.click();
        }}
      >
        {label}
      </Button>

      {localError !== null && <p className="field-error">{localError}</p>}
    </div>
  );
};
