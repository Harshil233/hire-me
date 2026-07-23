import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { FormField } from '@/components/FormField';
import { TextInput } from '@/components/TextInput';
import { isApiError } from '@/services/api-error';
import { useRegisterCandidate } from '../hooks/useAuthActions';
import { useServerFieldErrors } from '../hooks/useServerFieldErrors';
import {
  candidateRegisterFormSchema,
  type CandidateRegisterFormValues,
} from '../schemas/auth.schema';
import { PasswordField } from './PasswordField';

export interface CandidateRegisterFormProps {
  readonly onSuccess: () => void;
}

const DEFAULTS: CandidateRegisterFormValues = {
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  middleName: '',
  lastName: '',
};

export const CandidateRegisterForm = ({
  onSuccess,
}: CandidateRegisterFormProps): React.JSX.Element => {
  const register = useRegisterCandidate();
  const form = useForm<CandidateRegisterFormValues>({
    resolver: zodResolver(candidateRegisterFormSchema),
    defaultValues: DEFAULTS,
  });
  const {
    formState: { errors },
  } = form;

  useServerFieldErrors(register.error, form.setError);

  const submit = form.handleSubmit((values) => {
    register.mutate(values, { onSuccess });
  });

  const bannerMessage =
    isApiError(register.error) &&
    !register.error.isValidationError &&
    register.error.code !== 'EMAIL_ALREADY_EXISTS'
      ? register.error.message
      : null;

  return (
    <form
      onSubmit={(event) => {
        void submit(event);
      }}
      noValidate
      className="space-y-4"
    >
      {bannerMessage !== null && <Alert tone="error">{bannerMessage}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="First name" error={errors.firstName?.message} isRequired>
          {(fieldProps) => (
            <TextInput
              {...form.register('firstName')}
              {...fieldProps}
              autoComplete="given-name"
              isInvalid={errors.firstName !== undefined}
            />
          )}
        </FormField>

        <FormField label="Last name" error={errors.lastName?.message} isRequired>
          {(fieldProps) => (
            <TextInput
              {...form.register('lastName')}
              {...fieldProps}
              autoComplete="family-name"
              isInvalid={errors.lastName !== undefined}
            />
          )}
        </FormField>
      </div>

      <FormField label="Middle name" error={errors.middleName?.message} isOptional>
        {(fieldProps) => (
          <TextInput
            {...form.register('middleName')}
            {...fieldProps}
            autoComplete="additional-name"
            isInvalid={errors.middleName !== undefined}
          />
        )}
      </FormField>

      <FormField label="Email" error={errors.email?.message} isRequired>
        {(fieldProps) => (
          <TextInput
            {...form.register('email')}
            {...fieldProps}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            isInvalid={errors.email !== undefined}
          />
        )}
      </FormField>

      <PasswordField
        label="Password"
        registration={form.register('password')}
        error={errors.password?.message}
        autoComplete="new-password"
        showStrength
        value={form.watch('password')}
      />

      <PasswordField
        label="Confirm password"
        registration={form.register('confirmPassword')}
        error={errors.confirmPassword?.message}
        autoComplete="new-password"
      />

      <Button type="submit" isLoading={register.isPending} className="w-full">
        Create candidate account
      </Button>
    </form>
  );
};
