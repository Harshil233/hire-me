import { useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import type { FieldValues } from 'react-hook-form';

import { QUERY_KEYS } from '@/config/constants';
import type { ApiError } from '@/services/api-error';
import { createSectionApi, type ISectionApi } from '../api/section.api';
import type { SectionConfig } from '../types';

export interface UseSectionResult<TItem> {
  readonly query: UseQueryResult<TItem[], ApiError>;
  readonly save: UseMutationResult<TItem, ApiError, SaveVariables>;
  readonly remove: UseMutationResult<void, ApiError, string>;
}

export interface SaveVariables {
  /** Absent when creating. */
  readonly id?: string | undefined;
  readonly payload: Record<string, unknown>;
}

/**
 * List/create/update/delete for any section. Because adding or removing an entry
 * changes the completion score, the profile query is invalidated alongside the list.
 */
export const useSection = <TItem, TValues extends FieldValues>(
  config: SectionConfig<TItem, TValues>,
  api?: ISectionApi<TItem>,
): UseSectionResult<TItem> => {
  const queryClient = useQueryClient();
  const client = useMemo(() => api ?? createSectionApi<TItem>(config), [api, config]);
  const queryKey = QUERY_KEYS.section(config.key);

  const invalidate = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.profile }),
    ]);
  };

  const query = useQuery<TItem[], ApiError>({
    queryKey,
    queryFn: () => client.list(),
  });

  const save = useMutation<TItem, ApiError, SaveVariables>({
    mutationFn: ({ id, payload }) =>
      id === undefined ? client.create(payload) : client.update(id, payload),
    onSuccess: invalidate,
  });

  const remove = useMutation<void, ApiError, string>({
    mutationFn: (id) => client.remove(id),
    onSuccess: invalidate,
  });

  return { query, save, remove };
};
