import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { FormField } from '@/components/FormField';
import { TextInput } from '@/components/TextInput';
import { isApiError } from '@/services/api-error';
import { useRegisterHr } from '../hooks/useAuthActions';
import { useServerFieldErrors } from '../hooks/useServerFieldErrors';
import { hrRegisterFormSchema, type HrRegisterFormValues } from '../schemas/auth.schema';
import { PasswordField } from './PasswordField';

export interface HrRegisterFormProps {
  readonly onSuccess: () => void;
}

const DEFAULTS: HrRegisterFormValues = {
  email: '',
  password: '',
  confirmPassword: '',
  firstName: '',
  middleName: '',
  lastName: '',
  designation: '',
  companyName: '',
  companyDomain: '',
  companyHeadquarters: '',
  companyWebsiteUrl: '',
  companyLinkedinUrl: '',
};

/** The API nests company fields, so its errors are mapped back to the flat form. */
const SERVER_FIELD_MAP = {
  'company.name': 'companyName',
  'company.domain': 'companyDomain',
  'company.headquarters': 'companyHeadquarters',
  'company.websiteUrl': 'companyWebsiteUrl',
  'company.linkedinUrl': 'companyLinkedinUrl',
} as const;

export const HrRegisterForm = ({ onSuccess }: HrRegisterFormProps): React.JSX.Element => {
  const register = useRegisterHr();
  const form = useForm<HrRegisterFormValues>({
    resolver: zodResolver(hrRegisterFormSchema),
    defaultValues: DEFAULTS,
  });
  const {
    formState: { errors },
  } = form;

  useServerFieldErrors(register.error, form.setError, SERVER_FIELD_MAP);

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
      className="space-y-6"
    >
      {bannerMessage !== null && <Alert tone="error">{bannerMessage}</Alert>}

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-slate-900">Your details</legend>

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

        <FormField label="Designation" error={errors.designation?.message} hint="Optional">
          {(fieldProps) => (
            <TextInput
              {...form.register('designation')}
              {...fieldProps}
              placeholder="Talent Acquisition Lead"
              isInvalid={errors.designation !== undefined}
            />
          )}
        </FormField>

        <FormField label="Work email" error={errors.email?.message} isRequired>
          {(fieldProps) => (
            <TextInput
              {...form.register('email')}
              {...fieldProps}
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
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
      </fieldset>

      <fieldset className="space-y-4 border-t border-slate-200 pt-5">
        <legend className="text-sm font-semibold text-slate-900">Your company</legend>
        <p className="text-sm text-slate-500">
          Registering creates the company and makes you its owner.
        </p>

        <FormField label="Company name" error={errors.companyName?.message} isRequired>
          {(fieldProps) => (
            <TextInput
              {...form.register('companyName')}
              {...fieldProps}
              placeholder="Acme Corp"
              isInvalid={errors.companyName !== undefined}
            />
          )}
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Company domain"
            error={errors.companyDomain?.message}
            hint="Optional — e.g. acme.com"
          >
            {(fieldProps) => (
              <TextInput
                {...form.register('companyDomain')}
                {...fieldProps}
                placeholder="acme.com"
                isInvalid={errors.companyDomain !== undefined}
              />
            )}
          </FormField>

          <FormField
            label="Headquarters"
            error={errors.companyHeadquarters?.message}
            hint="Optional"
          >
            {(fieldProps) => (
              <TextInput
                {...form.register('companyHeadquarters')}
                {...fieldProps}
                placeholder="Pune, India"
                isInvalid={errors.companyHeadquarters !== undefined}
              />
            )}
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Website" error={errors.companyWebsiteUrl?.message} hint="Optional">
            {(fieldProps) => (
              <TextInput
                {...form.register('companyWebsiteUrl')}
                {...fieldProps}
                placeholder="https://acme.com"
                isInvalid={errors.companyWebsiteUrl !== undefined}
              />
            )}
          </FormField>

          <FormField label="LinkedIn" error={errors.companyLinkedinUrl?.message} hint="Optional">
            {(fieldProps) => (
              <TextInput
                {...form.register('companyLinkedinUrl')}
                {...fieldProps}
                placeholder="https://linkedin.com/company/acme"
                isInvalid={errors.companyLinkedinUrl !== undefined}
              />
            )}
          </FormField>
        </div>
      </fieldset>

      <Button type="submit" isLoading={register.isPending} className="w-full">
        Create employer account
      </Button>
    </form>
  );
};
