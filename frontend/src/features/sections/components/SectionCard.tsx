import { useState } from 'react';
import type { FieldValues } from 'react-hook-form';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { Card, EmptyState } from '@/components/Card';
import { SectionSkeleton } from '@/components/Skeleton';
import { isApiError } from '@/services/api-error';
import { useSection } from '../hooks/useSection';
import type { SectionConfig } from '../types';
import { SectionFormModal } from './SectionFormModal';
import { SectionItemRow } from './SectionItemRow';

export interface SectionCardProps<TItem, TValues extends FieldValues> {
  readonly config: SectionConfig<TItem, TValues>;
}

/**
 * List + add/edit/delete for one profile section. Composition only: the data lives in
 * `useSection`, the fields in the config (CLAUDE.md §10).
 */
export const SectionCard = <TItem, TValues extends FieldValues>({
  config,
}: SectionCardProps<TItem, TValues>): React.JSX.Element => {
  const { query, save, remove } = useSection(config);
  const [editing, setEditing] = useState<{ isOpen: boolean; item: TItem | undefined }>({
    isOpen: false,
    item: undefined,
  });

  const closeModal = (): void => {
    setEditing({ isOpen: false, item: undefined });
    save.reset();
  };

  const handleSubmit = (payload: Record<string, unknown>): void => {
    const id = editing.item === undefined ? undefined : config.present(editing.item).id;

    save.mutate({ id, payload }, { onSuccess: closeModal });
  };

  const items = query.data ?? [];

  return (
    <Card
      id={`section-${config.key}`}
      title={config.title}
      description={config.description}
      actions={
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setEditing({ isOpen: true, item: undefined });
          }}
        >
          {config.addLabel}
        </Button>
      }
    >
      {query.isPending && <SectionSkeleton />}

      {query.isError && (
        <Alert tone="error">
          {isApiError(query.error) ? query.error.message : 'Could not load this section.'}
        </Alert>
      )}

      {!query.isPending && !query.isError && items.length === 0 && (
        <EmptyState
          title={config.emptyTitle}
          description="Adding this raises your profile completion."
          action={
            <Button
              size="sm"
              onClick={() => {
                setEditing({ isOpen: true, item: undefined });
              }}
            >
              {config.addLabel}
            </Button>
          }
        />
      )}

      {items.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => {
            const view = config.present(item);
            return (
              <SectionItemRow
                key={view.id}
                view={view}
                isDeleting={remove.isPending && remove.variables === view.id}
                onEdit={() => {
                  setEditing({ isOpen: true, item });
                }}
                onDelete={() => {
                  remove.mutate(view.id);
                }}
              />
            );
          })}
        </ul>
      )}

      {remove.isError && (
        <Alert tone="error" className="mt-4">
          {isApiError(remove.error) ? remove.error.message : 'Could not delete that entry.'}
        </Alert>
      )}

      <SectionFormModal
        config={config}
        isOpen={editing.isOpen}
        item={editing.item}
        isSaving={save.isPending}
        error={save.error}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </Card>
  );
};
