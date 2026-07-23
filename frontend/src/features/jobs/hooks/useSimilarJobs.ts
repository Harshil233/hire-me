import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { ApiError } from '@/services/api-error';
import { jobApi, type IJobApi } from '../api/job.api';
import type { Job } from '../schemas/job.schema';

/** How many to offer under a listing — enough to be useful, not a second results page. */
const SIMILAR_SHOWN = 4;

export interface SimilarJobsInput {
  readonly id: string;
  readonly role: string;
}

/**
 * Other openings worth reading after this one: same discipline, this listing removed.
 *
 * Built on the browse endpoint rather than a bespoke one — "similar" here means the
 * filter a reader would have applied themselves, so there is nothing for the server to
 * know that the search cannot already answer.
 */
export const useSimilarJobs = (
  job: SimilarJobsInput | undefined,
  api: IJobApi = jobApi,
): UseQueryResult<Job[], ApiError> =>
  useQuery<Job[], ApiError>({
    queryKey: QUERY_KEYS.similarJobs(job?.id ?? ''),
    enabled: job !== undefined,
    queryFn: async () => {
      if (job === undefined) {
        return [];
      }

      // One over, so removing this listing still leaves a full row.
      const result = await api.browse({ role: job.role, pageSize: SIMILAR_SHOWN + 1 });

      return result.jobs.filter((other) => other.id !== job.id).slice(0, SIMILAR_SHOWN);
    },
  });
