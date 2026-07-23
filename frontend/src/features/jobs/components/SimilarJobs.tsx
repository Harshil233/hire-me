import { Skeleton } from '@/components/Skeleton';
import { useSimilarJobs, type SimilarJobsInput } from '../hooks/useSimilarJobs';
import { JobCard } from './JobCard';
import { payScaleOf } from '../utils/pay-scale';

export interface SimilarJobsProps {
  readonly job: SimilarJobsInput;
}

/**
 * What to read next. A listing is a dead end otherwise: someone who reaches the bottom
 * has either decided to apply or decided not to, and in both cases the useful thing to
 * offer is the nearest alternative rather than the browser's back button.
 */
export const SimilarJobs = ({ job }: SimilarJobsProps): React.JSX.Element | null => {
  const query = useSimilarJobs(job);

  if (query.isPending) {
    return (
      <section className="grid gap-3" data-testid="similar-jobs-loading">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-32" />
      </section>
    );
  }

  // Nothing comparable is not worth a heading saying so.
  if (query.isError || query.data.length === 0) {
    return null;
  }

  // Measured across the suggestions themselves, so the bands compare within this strip.
  const scale = payScaleOf(query.data);

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-fg">Similar roles</h2>
        <span className="numeric text-sm text-fg-subtle">{query.data.length}</span>
      </div>

      <div className="grid gap-3">
        {query.data.map((similar) => (
          <JobCard key={similar.id} job={similar} scale={scale} />
        ))}
      </div>
    </section>
  );
};
