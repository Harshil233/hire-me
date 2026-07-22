import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { FormField } from '@/components/FormField';
import { TextInput } from '@/components/TextInput';
import { CTC_CURRENCY, JOB_TYPE_LABELS, JOB_TYPE_VALUES } from '@/config/constants';
import { ChipsField } from '@/features/sections/components/ChipsField';
import { toJobPreferencesPayload, toJobPreferencesValues } from '../api/profile.mappers';
import { useUpdateProfile } from '../hooks/useProfile';
import {
  jobPreferencesFormSchema,
  type CandidateProfile,
  type JobPreferencesFormValues,
} from '../schemas/profile.schema';
import { ProfileFormCard } from './ProfileFormCard';

export interface JobPreferencesCardProps {
  readonly profile: CandidateProfile;
}

export const JobPreferencesCard = ({ profile }: JobPreferencesCardProps): React.JSX.Element => {
  const updateProfile = useUpdateProfile();
  const form = useForm<JobPreferencesFormValues>({
    resolver: zodResolver(jobPreferencesFormSchema),
    defaultValues: toJobPreferencesValues(profile),
  });

  useEffect(() => {
    form.reset(toJobPreferencesValues(profile));
  }, [profile, form]);

  const submit = form.handleSubmit((values) => {
    updateProfile.mutate(toJobPreferencesPayload(values));
  });

  const { errors } = form.formState;

  return (
    <ProfileFormCard
      id="section-skills"
      title="Skills and preferences"
      description="What you do, and the kind of role you are looking for."
      form={form}
      isSaving={updateProfile.isPending}
      isSaved={updateProfile.isSuccess}
      error={updateProfile.error}
      onSubmit={() => {
        void submit();
      }}
    >
      <ChipsField
        form={form}
        name="skills"
        label="Skills"
        placeholder="TypeScript, Node.js, MongoDB"
      />

      <ChipsField
        form={form}
        name="preferredLocations"
        label="Preferred locations"
        placeholder="Pune, Remote"
      />

      <fieldset>
        <legend className="field-label">Job types you are open to</legend>
        <Controller
          control={form.control}
          name="jobTypes"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {JOB_TYPE_VALUES.map((jobType) => {
                const isSelected = field.value.includes(jobType);

                return (
                  <button
                    key={jobType}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      field.onChange(
                        isSelected
                          ? field.value.filter((value) => value !== jobType)
                          : [...field.value, jobType],
                      );
                    }}
                    className={
                      isSelected
                        ? 'rounded-full bg-brand-600 px-3 py-1.5 text-sm font-medium text-white'
                        : 'rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-brand-400 hover:text-brand-700'
                    }
                  >
                    {JOB_TYPE_LABELS[jobType]}
                  </button>
                );
              })}
            </div>
          )}
        />
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label={`Current salary (${CTC_CURRENCY} per year)`}
          error={errors.currentCtc?.message}
          hint="Optional"
        >
          {(fieldProps) => (
            <TextInput
              {...form.register('currentCtc')}
              {...fieldProps}
              inputMode="numeric"
              placeholder="1200000"
              isInvalid={errors.currentCtc !== undefined}
            />
          )}
        </FormField>

        <FormField
          label={`Expected salary (${CTC_CURRENCY} per year)`}
          error={errors.expectedCtc?.message}
          hint="Optional"
        >
          {(fieldProps) => (
            <TextInput
              {...form.register('expectedCtc')}
              {...fieldProps}
              inputMode="numeric"
              placeholder="1800000"
              isInvalid={errors.expectedCtc !== undefined}
            />
          )}
        </FormField>
      </div>
    </ProfileFormCard>
  );
};
