import { cn } from '@/lib/cn';

export interface SpinnerProps {
  readonly size?: 'sm' | 'md' | 'lg';
  readonly label?: string;
  readonly className?: string;
}

const SIZES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-9 w-9 border-[3px]',
} as const;

export const Spinner = ({
  size = 'md',
  label = 'Loading',
  className,
}: SpinnerProps): React.JSX.Element => (
  <span
    role="status"
    aria-label={label}
    className={cn(
      'inline-block animate-spin rounded-full border-current border-t-transparent',
      SIZES[size],
      className,
    )}
  />
);
