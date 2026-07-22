import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type FieldValues } from 'react-hook-form';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { isApiError } from '@/services/api-error';
import { useServerFieldErrors } from '@/features/auth/hooks/useServerFieldErrors';
import type { SectionConfig } from '../types';

export interface SectionFormModalProps<TItem, TValues extends FieldValues> {
  readonly config: SectionConfig<TItem, TValues>;
  readonly isOpen: boolean;
  /** `undefined` opens the modal in "add" mode. */
  readonly item: TItem | undefined;
  readonly isSaving: boolean;
  readonly error: unknown;
  readonly onClose: () => void;
  readonly onSubmit: (payload: Record<string, unknown>) => void;
}

/** Add/edit dialog shared by every section. */
export const SectionFormModal = <TItem, TValues extends FieldValues>({
  config,
  isOpen,
  item,
  isSaving,
  error,
  onClose,
  onSubmit,
}: SectionFormModalProps<TItem, TValues>): React.JSX.Element => {
  const form = useForm<TValues>({
    resolver: zodResolver(config.formSchema),
    defaultValues: config.emptyValues as never,
  });

  useServerFieldErrors(error, form.setError);

  // Reopening for a different record must not leak the previous one's values.
  useEffect(() => {
    if (isOpen) {
      form.reset(item === undefined ? config.emptyValues : config.toValues(item));
    }
  }, [isOpen, item, config, form]);

  const submit = form.handleSubmit((values) => {
    onSubmit(config.toPayload(values));
  });

  const bannerMessage = isApiError(error) && !error.isValidationError ? error.message : null;

  return (
    <Modal
      isOpen={isOpen}
      title={item === undefined ? config.addLabel : `Edit ${config.title.toLowerCase()}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" form={`${config.key}-form`} isLoading={isSaving}>
            Save
          </Button>
        </>
      }
    >
      <form
        id={`${config.key}-form`}
        onSubmit={(event) => {
          void submit(event);
        }}
        noValidate
        className="space-y-4"
      >
        {bannerMessage !== null && <Alert tone="error">{bannerMessage}</Alert>}
        <config.FormFields form={form} />
      </form>
    </Modal>
  );
};
