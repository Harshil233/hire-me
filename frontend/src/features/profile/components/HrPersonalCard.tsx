import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { FormField } from '@/components/FormField';
import { TextInput } from '@/components/TextInput';
import { toHrPersonalPayload, toHrPersonalValues } from '../api/profile.mappers';
import { useUpdateProfile } from '../hooks/useProfile';
import {
  hrPersonalFormSchema,
  type HrPersonalFormValues,
  type HrProfile,
} from '../schemas/profile.schema';
import { PersonalDetailsFields } from './PersonalDetailsFields';
import { ProfileFormCard } from './ProfileFormCard';

export interface HrPersonalCardProps {
  readonly profile: HrProfile;
}

export const HrPersonalCard = ({ profile }: HrPersonalCardProps): React.JSX.Element => {
  const updateProfile = useUpdateProfile();
  const form = useForm<HrPersonalFormValues>({
    resolver: zodResolver(hrPersonalFormSchema),
    defaultValues: toHrPersonalValues(profile),
  });

  useEffect(() => {
    form.reset(toHrPersonalValues(profile));
  }, [profile, form]);

  const submit = form.handleSubmit((values) => {
    updateProfile.mutate(toHrPersonalPayload(values));
  });

  return (
    <ProfileFormCard
      id="section-name"
      title="Personal details"
      description="How candidates will see you."
      form={form}
      isSaving={updateProfile.isPending}
      isSaved={updateProfile.isSuccess}
      error={updateProfile.error}
      onSubmit={() => {
        void submit();
      }}
    >
      <PersonalDetailsFields form={form} />

      <FormField
        label="Designation"
        error={form.formState.errors.designation?.message}
        hint="Your role at the company"
      >
        {(fieldProps) => (
          <TextInput
            {...form.register('designation')}
            {...fieldProps}
            placeholder="Talent Acquisition Lead"
            isInvalid={form.formState.errors.designation !== undefined}
          />
        )}
      </FormField>
    </ProfileFormCard>
  );
};
