import { z } from 'zod';
import type { UseFormReturn } from 'react-hook-form';

import { FormField } from '@/components/FormField';
import { TextArea, TextInput } from '@/components/TextInput';
import { VALIDATION_LIMITS } from '@/config/constants';
import { formatMonthYear, toDateInputValue } from '@/lib/format';
import {
  dateRangeRule,
  optionalDateField,
  optionalTextField,
  optionalUrlField,
  orUndefined,
  pastDateField,
  requiredTextField,
} from '@/lib/validation';
import type { SectionConfig } from '../types';

export const certificationItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  issuedBy: z.string(),
  issuedOn: z.string(),
  expiresOn: z.string().optional(),
  credentialUrl: z.string().optional(),
  description: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CertificationItem = z.infer<typeof certificationItemSchema>;

export const certificationFormSchema = z
  .object({
    title: requiredTextField('Certification title'),
    issuedBy: requiredTextField('Issuing organisation'),
    issuedOn: pastDateField('Issue date'),
    expiresOn: optionalDateField('expiry date'),
    credentialUrl: optionalUrlField('credential URL'),
    description: optionalTextField(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH),
  })
  .superRefine(dateRangeRule('issuedOn', 'expiresOn'));
export type CertificationFormValues = z.infer<typeof certificationFormSchema>;

const CertificationFormFields = ({
  form,
}: {
  form: UseFormReturn<CertificationFormValues>;
}): React.JSX.Element => {
  const { errors } = form.formState;

  return (
    <>
      <FormField label="Certification" error={errors.title?.message} isRequired>
        {(fieldProps) => (
          <TextInput
            {...form.register('title')}
            {...fieldProps}
            placeholder="AWS Solutions Architect"
            isInvalid={errors.title !== undefined}
          />
        )}
      </FormField>

      <FormField label="Issued by" error={errors.issuedBy?.message} isRequired>
        {(fieldProps) => (
          <TextInput
            {...form.register('issuedBy')}
            {...fieldProps}
            placeholder="Amazon Web Services"
            isInvalid={errors.issuedBy !== undefined}
          />
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Issued on" error={errors.issuedOn?.message} isRequired>
          {(fieldProps) => (
            <TextInput
              {...form.register('issuedOn')}
              {...fieldProps}
              type="date"
              isInvalid={errors.issuedOn !== undefined}
            />
          )}
        </FormField>

        <FormField
          label="Expires on"
          error={errors.expiresOn?.message}
          hint="Optional — leave empty if it does not expire"
        >
          {(fieldProps) => (
            <TextInput
              {...form.register('expiresOn')}
              {...fieldProps}
              type="date"
              isInvalid={errors.expiresOn !== undefined}
            />
          )}
        </FormField>
      </div>

      <FormField label="Credential URL" error={errors.credentialUrl?.message} hint="Optional">
        {(fieldProps) => (
          <TextInput
            {...form.register('credentialUrl')}
            {...fieldProps}
            placeholder="https://credly.com/badges/…"
            isInvalid={errors.credentialUrl !== undefined}
          />
        )}
      </FormField>

      <FormField label="Notes" error={errors.description?.message} hint="Optional">
        {(fieldProps) => (
          <TextArea
            {...form.register('description')}
            {...fieldProps}
            isInvalid={errors.description !== undefined}
          />
        )}
      </FormField>
    </>
  );
};

export const certificationConfig: SectionConfig<CertificationItem, CertificationFormValues> = {
  key: 'certification',
  title: 'Certifications',
  description: 'Credentials that back up your skills.',
  resourcePath: '/certification',
  pluralKey: 'certifications',
  singularKey: 'certification',
  addLabel: 'Add certification',
  emptyTitle: 'No certifications added yet',
  itemSchema: certificationItemSchema,
  formSchema: certificationFormSchema,
  emptyValues: {
    title: '',
    issuedBy: '',
    issuedOn: '',
    expiresOn: '',
    credentialUrl: '',
    description: '',
  },

  toValues: (item) => ({
    title: item.title,
    issuedBy: item.issuedBy,
    issuedOn: toDateInputValue(item.issuedOn),
    expiresOn: toDateInputValue(item.expiresOn),
    credentialUrl: item.credentialUrl ?? '',
    description: item.description ?? '',
  }),

  toPayload: (values) => ({
    title: values.title,
    issuedBy: values.issuedBy,
    issuedOn: values.issuedOn,
    expiresOn: orUndefined(values.expiresOn),
    credentialUrl: orUndefined(values.credentialUrl),
    description: orUndefined(values.description),
  }),

  present: (item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.issuedBy,
    meta:
      item.expiresOn === undefined
        ? `Issued ${formatMonthYear(item.issuedOn)}`
        : `Issued ${formatMonthYear(item.issuedOn)} · Expires ${formatMonthYear(item.expiresOn)}`,
    ...(item.description !== undefined ? { description: item.description } : {}),
    ...(item.credentialUrl !== undefined ? { link: item.credentialUrl } : {}),
  }),

  FormFields: CertificationFormFields,
};
