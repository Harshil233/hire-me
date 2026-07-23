import { z } from 'zod';
import type { UseFormReturn } from 'react-hook-form';

import { FormField } from '@/components/FormField';
import { TextArea, TextInput } from '@/components/TextInput';
import { VALIDATION_LIMITS } from '@/config/constants';
import { formatDateRange, toDateInputValue } from '@/lib/format';
import { errorFor } from '@/lib/form';
import {
  chipsField,
  dateRangeRule,
  optionalDateField,
  optionalTextField,
  orUndefined,
  pastDateField,
  requiredTextField,
} from '@/lib/validation';
import { ChipsField } from '../components/ChipsField';
import { DateRangeFields } from '../components/DateRangeFields';
import type { SectionConfig } from '../types';

export const experienceItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  companyName: z.string(),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  isCurrent: z.boolean(),
  skills: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ExperienceItem = z.infer<typeof experienceItemSchema>;

export const experienceFormSchema = z
  .object({
    title: requiredTextField('Job title'),
    companyName: requiredTextField('Company name'),
    startDate: pastDateField('Start date'),
    endDate: optionalDateField('end date'),
    isCurrent: z.boolean(),
    skills: chipsField('Skills'),
    description: optionalTextField(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH),
  })
  .superRefine(dateRangeRule('startDate', 'endDate', 'isCurrent'));
export type ExperienceFormValues = z.infer<typeof experienceFormSchema>;

const ExperienceFormFields = ({
  form,
}: {
  form: UseFormReturn<ExperienceFormValues>;
}): React.JSX.Element => {
  const { errors } = form.formState;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Job title" error={errors.title?.message} isRequired>
          {(fieldProps) => (
            <TextInput
              {...form.register('title')}
              {...fieldProps}
              placeholder="Backend Engineer"
              isInvalid={errors.title !== undefined}
            />
          )}
        </FormField>

        <FormField label="Company" error={errors.companyName?.message} isRequired>
          {(fieldProps) => (
            <TextInput
              {...form.register('companyName')}
              {...fieldProps}
              placeholder="Acme Corp"
              isInvalid={errors.companyName !== undefined}
            />
          )}
        </FormField>
      </div>

      <DateRangeFields
        form={form}
        startLabel="Start date"
        endLabel="End date"
        currentLabel="I currently work here"
      />

      <ChipsField form={form} name="skills" label="Skills used" placeholder="TypeScript" />

      <FormField label="What did you do?" error={errorFor(errors, 'description')} isOptional>
        {(fieldProps) => (
          <TextArea
            {...form.register('description')}
            {...fieldProps}
            placeholder="Owned the payments service…"
            isInvalid={errors.description !== undefined}
          />
        )}
      </FormField>
    </>
  );
};

export const experienceConfig: SectionConfig<ExperienceItem, ExperienceFormValues> = {
  key: 'experience',
  title: 'Work experience',
  description: 'Roles you have held, most recent first.',
  resourcePath: '/experience',
  pluralKey: 'experiences',
  singularKey: 'experience',
  addLabel: 'Add experience',
  emptyTitle: 'No work experience added yet',
  itemSchema: experienceItemSchema,
  formSchema: experienceFormSchema,
  emptyValues: {
    title: '',
    companyName: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    skills: [],
    description: '',
  },

  toValues: (item) => ({
    title: item.title,
    companyName: item.companyName,
    startDate: toDateInputValue(item.startDate),
    endDate: toDateInputValue(item.endDate),
    isCurrent: item.isCurrent,
    skills: [...item.skills],
    description: item.description ?? '',
  }),

  toPayload: (values) => ({
    title: values.title,
    companyName: values.companyName,
    startDate: values.startDate,
    endDate: values.isCurrent ? undefined : orUndefined(values.endDate),
    isCurrent: values.isCurrent,
    skills: values.skills,
    description: orUndefined(values.description),
  }),

  present: (item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.companyName,
    meta: formatDateRange(item.startDate, item.endDate, item.isCurrent),
    ...(item.description !== undefined ? { description: item.description } : {}),
    tags: item.skills,
  }),

  FormFields: ExperienceFormFields,
};
