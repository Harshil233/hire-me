import { useFileObjectUrl } from '@/features/profile/hooks/useFileObjectUrl';
import { cn } from '@/lib/cn';

export type CompanyLogoSize = 'sm' | 'md';

const SIZE_CLASSES: Record<CompanyLogoSize, string> = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-14 w-14 text-lg',
};

export interface CompanyLogoProps {
  readonly name: string;
  readonly logoFileId?: string | undefined;
  readonly size?: CompanyLogoSize;
}

/**
 * The employer's mark on a listing: their logo where one has been uploaded, and the
 * initial of the company name where it has not. A square rather than a circle, so it is
 * never mistaken for the round avatar a person gets.
 */
export const CompanyLogo = ({
  name,
  logoFileId,
  size = 'sm',
}: CompanyLogoProps): React.JSX.Element => {
  const logoUrl = useFileObjectUrl(logoFileId);

  const className = cn(
    'flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-inset font-semibold text-fg-muted',
    SIZE_CLASSES[size],
  );

  if (logoUrl !== null) {
    return (
      <span aria-hidden="true" className={className}>
        {/* `contain`, because a logo cropped to fill stops being the logo. */}
        <img src={logoUrl} alt="" className="h-full w-full object-contain p-1" />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={className}>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
};
