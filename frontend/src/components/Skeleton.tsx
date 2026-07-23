import { cn } from '@/lib/cn';

export interface SkeletonProps {
  readonly className?: string;
}

export const Skeleton = ({ className }: SkeletonProps): React.JSX.Element => (
  <div
    aria-hidden="true"
    className={cn(
      'animate-pulse rounded-[var(--radius-control)] border border-border bg-surface-inset',
      className,
    )}
  />
);

/** Placeholder used while a profile section loads. */
export const SectionSkeleton = (): React.JSX.Element => (
  <div className="space-y-3">
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-16 w-full" />
  </div>
);
