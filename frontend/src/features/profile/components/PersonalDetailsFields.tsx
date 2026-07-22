import type { FieldValues, UseFormReturn } from 'react-hook-form';

import { FormField } from '@/components/FormField';
import { Select } from '@/components/Select';
import { TextInput } from '@/components/TextInput';
import { GENDER_LABELS, GENDER_VALUES } from '@/config/constants';
import { errorFor, fieldName } from '@/lib/form';

export interface PersonalDetailsFieldsProps<TValues extends FieldValues> {
  readonly form: UseFormReturn<TValues>;
}

const GENDER_OPTIONS = GENDER_VALUES.map((value) => ({ value, label: GENDER_LABELS[value] }));

/**
 * Name, gender, date of birth and mobile — identical for both roles, so it is written
 * once and composed into each role's form (CLAUDE.md §9).
 */
export const PersonalDetailsFields = <TValues extends FieldValues>({
  form,
}: PersonalDetailsFieldsProps<TValues>): React.JSX.Element => {
  const { errors } = form.formState;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="First name" error={errorFor(errors, 'firstName')} isRequired>
          {(fieldProps) => (
            <TextInput
              {...form.register(fieldName<TValues>('firstName'))}
              {...fieldProps}
              autoComplete="given-name"
              isInvalid={errorFor(errors, 'firstName') !== undefined}
            />
          )}
        </FormField>

        <FormField label="Middle name" error={errorFor(errors, 'middleName')}>
          {(fieldProps) => (
            <TextInput
              {...form.register(fieldName<TValues>('middleName'))}
              {...fieldProps}
              autoComplete="additional-name"
              isInvalid={errorFor(errors, 'middleName') !== undefined}
            />
          )}
        </FormField>

        <FormField label="Last name" error={errorFor(errors, 'lastName')} isRequired>
          {(fieldProps) => (
            <TextInput
              {...form.register(fieldName<TValues>('lastName'))}
              {...fieldProps}
              autoComplete="family-name"
              isInvalid={errorFor(errors, 'lastName') !== undefined}
            />
          )}
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Gender" error={errorFor(errors, 'gender')}>
          {(fieldProps) => (
            <Select
              {...form.register(fieldName<TValues>('gender'))}
              {...fieldProps}
              options={GENDER_OPTIONS}
              placeholder="Select"
              isInvalid={errorFor(errors, 'gender') !== undefined}
            />
          )}
        </FormField>

        <FormField label="Date of birth" error={errorFor(errors, 'dob')}>
          {(fieldProps) => (
            <TextInput
              {...form.register(fieldName<TValues>('dob'))}
              {...fieldProps}
              type="date"
              isInvalid={errorFor(errors, 'dob') !== undefined}
            />
          )}
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <FormField label="Code" error={errorFor(errors, 'countryCode')}>
          {(fieldProps) => (
            <TextInput
              {...form.register(fieldName<TValues>('countryCode'))}
              {...fieldProps}
              placeholder="+91"
              inputMode="tel"
              isInvalid={errorFor(errors, 'countryCode') !== undefined}
            />
          )}
        </FormField>

        <FormField label="Mobile number" error={errorFor(errors, 'mobileNumber')}>
          {(fieldProps) => (
            <TextInput
              {...form.register(fieldName<TValues>('mobileNumber'))}
              {...fieldProps}
              placeholder="9876543210"
              inputMode="numeric"
              autoComplete="tel-national"
              isInvalid={errorFor(errors, 'mobileNumber') !== undefined}
            />
          )}
        </FormField>
      </div>
    </>
  );
};
