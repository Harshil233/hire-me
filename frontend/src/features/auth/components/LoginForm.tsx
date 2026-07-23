import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Alert } from '@/components/Alert';
import type { Role } from '@/config/constants';
import type { SessionUser } from '@/store/auth.store';
import { Button } from '@/components/Button';
import { FormField } from '@/components/FormField';
import { TextInput } from '@/components/TextInput';
import { isApiError } from '@/services/api-error';
import { useLogin } from '../hooks/useAuthActions';
import { useServerFieldErrors } from '../hooks/useServerFieldErrors';
import { loginFormSchema, type LoginFormValues } from '../schemas/auth.schema';
import { PasswordField } from './PasswordField';

export interface LoginFormProps {
  /** Which role's sign-in path this submission goes to. */
  readonly role: Role;
  readonly onSuccess: (user: SessionUser) => void;
}

export const LoginForm = ({ role, onSuccess }: LoginFormProps): React.JSX.Element => {
  const login = useLogin();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  useServerFieldErrors(login.error, setError);

  const submit = handleSubmit((values) => {
    login.mutate(
      { role, values },
      {
        onSuccess: (session) => {
          onSuccess(session.user);
        },
      },
    );
  });

  // Credential failures are deliberately not tied to a field: the server does not say
  // which half was wrong, and neither should the UI.
  const bannerMessage =
    isApiError(login.error) && !login.error.isValidationError ? login.error.message : null;

  return (
    <form
      onSubmit={(event) => {
        void submit(event);
      }}
      noValidate
      className="space-y-4"
    >
      {bannerMessage !== null && <Alert tone="error">{bannerMessage}</Alert>}

      <FormField label="Email" error={errors.email?.message} isRequired>
        {(fieldProps) => (
          <TextInput
            {...register('email')}
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
        registration={register('password')}
        error={errors.password?.message}
        autoComplete="current-password"
      />

      <Button type="submit" isLoading={login.isPending} className="w-full">
        Sign in
      </Button>
    </form>
  );
};
