import { Controller, type FieldValues, type UseFormReturn } from 'react-hook-form';

import { ChipsInput } from '@/components/ChipsInput';
import { FormField } from '@/components/FormField';
import { errorFor, fieldName } from '@/lib/form';

export interface ChipsFieldProps<TValues extends FieldValues> {
  readonly form: UseFormReturn<TValues>;
  readonly name: string;
  readonly label: string;
  readonly placeholder?: string;
  readonly hint?: string;
}

/** Wires the chips control into a react-hook-form field. */
export const ChipsField = <TValues extends FieldValues>({
  form,
  name,
  label,
  placeholder,
  hint = 'Press Enter or comma to add',
}: ChipsFieldProps<TValues>): React.JSX.Element => {
  const error = errorFor(form.formState.errors, name);

  return (
    <FormField label={label} error={error} hint={hint}>
      {(fieldProps) => (
        <Controller
          control={form.control}
          name={fieldName<TValues>(name)}
          render={({ field }) => (
            <ChipsInput
              id={fieldProps.id}
              aria-describedby={fieldProps['aria-describedby']}
              isInvalid={error !== undefined}
              value={(field.value as string[] | undefined) ?? []}
              onChange={field.onChange}
              {...(placeholder !== undefined ? { placeholder } : {})}
            />
          )}
        />
      )}
    </FormField>
  );
};
