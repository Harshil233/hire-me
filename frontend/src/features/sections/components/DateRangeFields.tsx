import { Controller, type FieldValues, type UseFormReturn } from 'react-hook-form';

import { FormField } from '@/components/FormField';
import { TextInput } from '@/components/TextInput';
import { errorFor, fieldName } from '@/lib/form';

export interface DateRangeFieldsProps<TValues extends FieldValues> {
  readonly form: UseFormReturn<TValues>;
  readonly startLabel: string;
  readonly endLabel: string;
  readonly currentLabel?: string;
}

/**
 * Start/end dates with an "ongoing" toggle — shared by experience, education and
 * projects. Ticking the toggle clears and disables the end date, which is exactly the
 * rule the API enforces.
 */
export const DateRangeFields = <TValues extends FieldValues>({
  form,
  startLabel,
  endLabel,
  currentLabel,
}: DateRangeFieldsProps<TValues>): React.JSX.Element => {
  const { errors } = form.formState;
  const isCurrent = currentLabel !== undefined && form.watch(fieldName<TValues>('isCurrent'));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={startLabel} error={errorFor(errors, 'startDate')} isRequired>
          {(fieldProps) => (
            <TextInput
              {...form.register(fieldName<TValues>('startDate'))}
              {...fieldProps}
              type="date"
              isInvalid={errorFor(errors, 'startDate') !== undefined}
            />
          )}
        </FormField>

        <FormField
          label={endLabel}
          error={errorFor(errors, 'endDate')}
          isOptional
          {...(isCurrent === true ? { hint: 'Not needed while ongoing' } : {})}
        >
          {(fieldProps) => (
            <TextInput
              {...form.register(fieldName<TValues>('endDate'))}
              {...fieldProps}
              type="date"
              disabled={isCurrent === true}
              isInvalid={errorFor(errors, 'endDate') !== undefined}
            />
          )}
        </FormField>
      </div>

      {currentLabel !== undefined && (
        <Controller
          control={form.control}
          name={fieldName<TValues>('isCurrent')}
          render={({ field }) => (
            <label className="flex w-fit items-center gap-2 text-sm text-fg">
              <input
                type="checkbox"
                checked={field.value === true}
                onChange={(event) => {
                  field.onChange(event.target.checked);
                  if (event.target.checked) {
                    form.setValue(fieldName<TValues>('endDate'), '' as never);
                  }
                }}
                className="h-4 w-4 rounded border-border-strong text-brand-text focus:ring-brand-500"
              />
              {currentLabel}
            </label>
          )}
        />
      )}
    </div>
  );
};
