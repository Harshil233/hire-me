import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { FormField } from '@/components/FormField';
import { Modal } from '@/components/Modal';
import { isApiError } from '@/services/api-error';
import { applyFormSchema, type ApplyFormValues } from '../schemas/application.schema';

export interface ApplyModalProps {
  readonly isOpen: boolean;
  readonly jobTitle: string;
  readonly isApplying: boolean;
  readonly error: unknown;
  readonly onSubmit: (values: ApplyFormValues) => void;
  readonly onClose: () => void;
}

export const ApplyModal = ({
  isOpen,
  jobTitle,
  isApplying,
  error,
  onSubmit,
  onClose,
}: ApplyModalProps): React.JSX.Element => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplyFormValues>({
    resolver: zodResolver(applyFormSchema),
    defaultValues: { coverNote: '' },
  });

  const bannerMessage = isApiError(error) ? error.message : null;

  const submit = handleSubmit((values) => {
    onSubmit(values);
  });

  return (
    <Modal
      isOpen={isOpen}
      title={`Apply to ${jobTitle}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            isLoading={isApplying}
            onClick={() => {
              void submit();
            }}
          >
            Submit application
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          void submit(event);
        }}
        noValidate
        className="space-y-4"
      >
        {bannerMessage !== null && <Alert tone="error">{bannerMessage}</Alert>}

        <p className="text-sm text-slate-600">
          Your profile and the résumé currently on it are sent with this application.
        </p>

        <FormField
          label="Cover note"
          error={errors.coverNote?.message}
          hint="Optional — a short note to the employer."
        >
          {(fieldProps) => (
            <textarea
              {...register('coverNote')}
              {...fieldProps}
              rows={5}
              className="field-control"
              placeholder="Why you are a good fit for this role."
            />
          )}
        </FormField>
      </form>
    </Modal>
  );
};
