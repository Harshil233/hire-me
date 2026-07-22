import type { ReactNode } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { isApiError } from '@/services/api-error';
import { useServerFieldErrors } from '@/features/auth/hooks/useServerFieldErrors';

export interface ProfileFormCardProps<TValues extends FieldValues> {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly form: UseFormReturn<TValues>;
  readonly isSaving: boolean;
  readonly isSaved: boolean;
  readonly error: unknown;
  readonly onSubmit: () => void;
  readonly children: ReactNode;
}

/**
 * Card wrapper every profile form shares: submit button, saved confirmation, error
 * banner and mapping of server field errors back onto the inputs (CLAUDE.md §9).
 */
export const ProfileFormCard = <TValues extends FieldValues>({
  id,
  title,
  description,
  form,
  isSaving,
  isSaved,
  error,
  onSubmit,
  children,
}: ProfileFormCardProps<TValues>): React.JSX.Element => {
  useServerFieldErrors(error, form.setError);

  const bannerMessage = isApiError(error) && !error.isValidationError ? error.message : null;
  const isDirty = form.formState.isDirty;

  return (
    <Card id={id} title={title} {...(description !== undefined ? { description } : {})}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        noValidate
        className="space-y-4"
      >
        {bannerMessage !== null && <Alert tone="error">{bannerMessage}</Alert>}

        {children}

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          {isSaved && !isDirty && (
            <span role="status" className="text-sm font-medium text-emerald-600">
              Saved
            </span>
          )}
          <Button type="submit" isLoading={isSaving} disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
};
