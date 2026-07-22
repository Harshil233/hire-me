import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { FormField } from '@/components/FormField';
import { TextInput } from '@/components/TextInput';
import { toCandidatePersonalPayload, toCandidatePersonalValues } from '../api/profile.mappers';
import { useUpdateProfile } from '../hooks/useProfile';
import {
  candidatePersonalFormSchema,
  type CandidatePersonalFormValues,
  type CandidateProfile,
} from '../schemas/profile.schema';
import { PersonalDetailsFields } from './PersonalDetailsFields';
import { ProfileFormCard } from './ProfileFormCard';

export interface CandidatePersonalCardProps {
  readonly profile: CandidateProfile;
}

export const CandidatePersonalCard = ({
  profile,
}: CandidatePersonalCardProps): React.JSX.Element => {
  const updateProfile = useUpdateProfile();
  const form = useForm<CandidatePersonalFormValues>({
    resolver: zodResolver(candidatePersonalFormSchema),
    defaultValues: toCandidatePersonalValues(profile),
  });

  // Keeps the form in step with a profile refreshed elsewhere (e.g. after an upload).
  useEffect(() => {
    form.reset(toCandidatePersonalValues(profile));
  }, [profile, form]);

  const submit = form.handleSubmit((values) => {
    updateProfile.mutate(toCandidatePersonalPayload(values));
  });

  return (
    <ProfileFormCard
      id="section-name"
      title="Personal details"
      description="How employers will see and reach you."
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
        label="Current location"
        error={form.formState.errors.currentLocation?.message}
        hint="City you are based in"
      >
        {(fieldProps) => (
          <TextInput
            {...form.register('currentLocation')}
            {...fieldProps}
            placeholder="Pune"
            isInvalid={form.formState.errors.currentLocation !== undefined}
          />
        )}
      </FormField>
    </ProfileFormCard>
  );
};
