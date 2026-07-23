import { z } from 'zod';
import type { UseFormReturn } from 'react-hook-form';

import { FormField } from '@/components/FormField';
import { TextArea, TextInput } from '@/components/TextInput';
import { VALIDATION_LIMITS } from '@/config/constants';
import { formatDateRange, toDateInputValue } from '@/lib/format';
import {
  dateRangeRule,
  optionalDateField,
  optionalTextField,
  orUndefined,
  pastDateField,
  requiredTextField,
} from '@/lib/validation';
import { DateRangeFields } from '../components/DateRangeFields';
import type { SectionConfig } from '../types';

export const educationItemSchema = z.object({
  id: z.string(),
  college: z.string(),
  course: z.string(),
  degree: z.string(),
  description: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  isCurrent: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EducationItem = z.infer<typeof educationItemSchema>;

export const educationFormSchema = z
  .object({
    college: requiredTextField('College or university'),
    course: requiredTextField('Course'),
    degree: requiredTextField('Degree'),
    startDate: pastDateField('Start date'),
    endDate: optionalDateField('end date'),
    isCurrent: z.boolean(),
    description: optionalTextField(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH),
  })
  .superRefine(dateRangeRule('startDate', 'endDate', 'isCurrent'));
export type EducationFormValues = z.infer<typeof educationFormSchema>;

const EducationFormFields = ({
  form,
}: {
  form: UseFormReturn<EducationFormValues>;
}): React.JSX.Element => {
  const { errors } = form.formState;

  return (
    <>
      <FormField label="College or university" error={errors.college?.message} isRequired>
        {(fieldProps) => (
          <TextInput
            {...form.register('college')}
            {...fieldProps}
            placeholder="IIT Bombay"
            isInvalid={errors.college !== undefined}
          />
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Degree" error={errors.degree?.message} isRequired>
          {(fieldProps) => (
            <TextInput
              {...form.register('degree')}
              {...fieldProps}
              placeholder="B.Tech"
              isInvalid={errors.degree !== undefined}
            />
          )}
        </FormField>

        <FormField label="Course" error={errors.course?.message} isRequired>
          {(fieldProps) => (
            <TextInput
              {...form.register('course')}
              {...fieldProps}
              placeholder="Computer Science"
              isInvalid={errors.course !== undefined}
            />
          )}
        </FormField>
      </div>

      <DateRangeFields
        form={form}
        startLabel="Start date"
        endLabel="End date"
        currentLabel="I am still studying here"
      />

      <FormField label="Highlights" error={errors.description?.message} isOptional>
        {(fieldProps) => (
          <TextArea
            {...form.register('description')}
            {...fieldProps}
            placeholder="Coursework, achievements, thesis…"
            isInvalid={errors.description !== undefined}
          />
        )}
      </FormField>
    </>
  );
};

export const educationConfig: SectionConfig<EducationItem, EducationFormValues> = {
  key: 'education',
  title: 'Education',
  description: 'Degrees and courses you have completed.',
  resourcePath: '/education',
  pluralKey: 'educations',
  singularKey: 'education',
  addLabel: 'Add education',
  emptyTitle: 'No education added yet',
  itemSchema: educationItemSchema,
  formSchema: educationFormSchema,
  emptyValues: {
    college: '',
    course: '',
    degree: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    description: '',
  },

  toValues: (item) => ({
    college: item.college,
    course: item.course,
    degree: item.degree,
    startDate: toDateInputValue(item.startDate),
    endDate: toDateInputValue(item.endDate),
    isCurrent: item.isCurrent,
    description: item.description ?? '',
  }),

  toPayload: (values) => ({
    college: values.college,
    course: values.course,
    degree: values.degree,
    startDate: values.startDate,
    endDate: values.isCurrent ? undefined : orUndefined(values.endDate),
    isCurrent: values.isCurrent,
    description: orUndefined(values.description),
  }),

  present: (item) => ({
    id: item.id,
    title: `${item.degree} · ${item.course}`,
    subtitle: item.college,
    meta: formatDateRange(item.startDate, item.endDate, item.isCurrent),
    ...(item.description !== undefined ? { description: item.description } : {}),
  }),

  FormFields: EducationFormFields,
};
