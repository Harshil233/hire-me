import { z } from 'zod';
import type { UseFormReturn } from 'react-hook-form';

import { FormField } from '@/components/FormField';
import { TextArea, TextInput } from '@/components/TextInput';
import { VALIDATION_LIMITS } from '@/config/constants';
import { formatDateRange, toDateInputValue } from '@/lib/format';
import {
  chipsField,
  dateRangeRule,
  optionalDateField,
  optionalTextField,
  optionalUrlField,
  orUndefined,
  pastDateField,
  requiredTextField,
} from '@/lib/validation';
import { ChipsField } from '../components/ChipsField';
import { DateRangeFields } from '../components/DateRangeFields';
import type { SectionConfig } from '../types';

export const projectItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  skills: z.array(z.string()),
  domain: z.string().optional(),
  link: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  isCurrent: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ProjectItem = z.infer<typeof projectItemSchema>;

export const projectFormSchema = z
  .object({
    title: requiredTextField('Project title'),
    domain: optionalTextField(VALIDATION_LIMITS.SHORT_TEXT_MAX_LENGTH),
    link: optionalUrlField('project URL'),
    skills: chipsField('Skills'),
    startDate: pastDateField('Start date'),
    endDate: optionalDateField('end date'),
    isCurrent: z.boolean(),
    description: optionalTextField(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH),
  })
  .superRefine(dateRangeRule('startDate', 'endDate', 'isCurrent'));
export type ProjectFormValues = z.infer<typeof projectFormSchema>;

const ProjectFormFields = ({
  form,
}: {
  form: UseFormReturn<ProjectFormValues>;
}): React.JSX.Element => {
  const { errors } = form.formState;

  return (
    <>
      <FormField label="Project title" error={errors.title?.message} isRequired>
        {(fieldProps) => (
          <TextInput
            {...form.register('title')}
            {...fieldProps}
            placeholder="Job portal"
            isInvalid={errors.title !== undefined}
          />
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Domain" error={errors.domain?.message} hint="Optional — e.g. Fintech">
          {(fieldProps) => (
            <TextInput
              {...form.register('domain')}
              {...fieldProps}
              isInvalid={errors.domain !== undefined}
            />
          )}
        </FormField>

        <FormField label="Link" error={errors.link?.message} hint="Optional">
          {(fieldProps) => (
            <TextInput
              {...form.register('link')}
              {...fieldProps}
              placeholder="https://github.com/…"
              isInvalid={errors.link !== undefined}
            />
          )}
        </FormField>
      </div>

      <DateRangeFields
        form={form}
        startLabel="Start date"
        endLabel="End date"
        currentLabel="I am still working on this"
      />

      <ChipsField form={form} name="skills" label="Technologies" placeholder="React" />

      <FormField label="What is it about?" error={errors.description?.message} hint="Optional">
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

export const projectConfig: SectionConfig<ProjectItem, ProjectFormValues> = {
  key: 'project',
  title: 'Projects',
  description: 'Things you have built, at work or on your own.',
  resourcePath: '/project',
  pluralKey: 'projects',
  singularKey: 'project',
  addLabel: 'Add project',
  emptyTitle: 'No projects added yet',
  itemSchema: projectItemSchema,
  formSchema: projectFormSchema,
  emptyValues: {
    title: '',
    domain: '',
    link: '',
    skills: [],
    startDate: '',
    endDate: '',
    isCurrent: false,
    description: '',
  },

  toValues: (item) => ({
    title: item.title,
    domain: item.domain ?? '',
    link: item.link ?? '',
    skills: [...item.skills],
    startDate: toDateInputValue(item.startDate),
    endDate: toDateInputValue(item.endDate),
    isCurrent: item.isCurrent,
    description: item.description ?? '',
  }),

  toPayload: (values) => ({
    title: values.title,
    domain: orUndefined(values.domain),
    link: orUndefined(values.link),
    skills: values.skills,
    startDate: values.startDate,
    endDate: values.isCurrent ? undefined : orUndefined(values.endDate),
    isCurrent: values.isCurrent,
    description: orUndefined(values.description),
  }),

  present: (item) => ({
    id: item.id,
    title: item.title,
    ...(item.domain !== undefined ? { subtitle: item.domain } : {}),
    meta: formatDateRange(item.startDate, item.endDate, item.isCurrent),
    ...(item.description !== undefined ? { description: item.description } : {}),
    ...(item.link !== undefined ? { link: item.link } : {}),
    tags: item.skills,
  }),

  FormFields: ProjectFormFields,
};
