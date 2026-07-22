import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Alert } from '@/components/Alert';
import { FormField } from '@/components/FormField';
import { TextArea, TextInput } from '@/components/TextInput';
import { FILE_KINDS } from '@/config/constants';
import { ChipsField } from '@/features/sections/components/ChipsField';
import { toCompanyPayload, toCompanyValues } from '../api/profile.mappers';
import { useFileObjectUrl } from '../hooks/useFileObjectUrl';
import { useUpdateCompany, useUploadFile } from '../hooks/useProfile';
import { companyFormSchema, type Company, type CompanyFormValues } from '../schemas/profile.schema';
import { FileUploadButton } from './FileUploadButton';
import { ProfileFormCard } from './ProfileFormCard';

export interface CompanyCardProps {
  readonly company: Company | null;
  readonly canManage: boolean;
}

const SOCIAL_FIELDS = [
  { name: 'websiteUrl', label: 'Website', placeholder: 'https://acme.com' },
  { name: 'linkedinUrl', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/acme' },
  { name: 'facebookUrl', label: 'Facebook', placeholder: 'https://facebook.com/acme' },
  { name: 'instagramUrl', label: 'Instagram', placeholder: 'https://instagram.com/acme' },
  { name: 'googleMapsLink', label: 'Google Maps', placeholder: 'https://maps.app.goo.gl/…' },
] as const;

export const CompanyCard = ({ company, canManage }: CompanyCardProps): React.JSX.Element => {
  const updateCompany = useUpdateCompany();
  const upload = useUploadFile();
  const logoUrl = useFileObjectUrl(company?.logoFileId);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: toCompanyValues(company),
  });

  useEffect(() => {
    form.reset(toCompanyValues(company));
  }, [company, form]);

  const { errors } = form.formState;

  if (company === null) {
    return (
      <Alert tone="warning" title="No company linked">
        Your account is not linked to a company yet. Contact support so an administrator can connect
        it.
      </Alert>
    );
  }

  const submit = form.handleSubmit((values) => {
    updateCompany.mutate({ companyId: company.id, payload: toCompanyPayload(values) });
  });

  const handleLogoSelect = (file: File): void => {
    upload.mutate(
      { kind: FILE_KINDS.COMPANY_LOGO, file },
      {
        onSuccess: (uploaded) => {
          updateCompany.mutate({
            companyId: company.id,
            payload: { ...toCompanyPayload(form.getValues()), logoFileId: uploaded.id },
          });
        },
      },
    );
  };

  if (!canManage) {
    return (
      <Alert tone="info" title={company.name}>
        Only a company owner can edit these details.
      </Alert>
    );
  }

  return (
    <ProfileFormCard
      id="section-company"
      title="Company"
      description="What candidates see when they look up your organisation."
      form={form}
      isSaving={updateCompany.isPending}
      isSaved={updateCompany.isSuccess}
      error={updateCompany.error}
      onSubmit={() => {
        void submit();
      }}
    >
      <div className="flex items-center gap-4">
        {logoUrl === null ? (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-lg font-semibold text-slate-500">
            {company.name.charAt(0).toUpperCase()}
          </div>
        ) : (
          <img
            src={logoUrl}
            alt=""
            className="h-16 w-16 rounded-lg object-contain ring-1 ring-slate-200"
          />
        )}

        <FileUploadButton
          kind={FILE_KINDS.COMPANY_LOGO}
          label={company.logoFileId === undefined ? 'Add logo' : 'Change logo'}
          isUploading={upload.isPending}
          onSelect={handleLogoSelect}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Company name" error={errors.name?.message} isRequired>
          {(fieldProps) => (
            <TextInput
              {...form.register('name')}
              {...fieldProps}
              isInvalid={errors.name !== undefined}
            />
          )}
        </FormField>

        <FormField label="Domain" error={errors.domain?.message} hint="e.g. acme.com">
          {(fieldProps) => (
            <TextInput
              {...form.register('domain')}
              {...fieldProps}
              isInvalid={errors.domain !== undefined}
            />
          )}
        </FormField>
      </div>

      <FormField label="About the company" error={errors.description?.message}>
        {(fieldProps) => (
          <TextArea
            {...form.register('description')}
            {...fieldProps}
            placeholder="What the company does, and what it is like to work there."
            isInvalid={errors.description !== undefined}
          />
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Headquarters" error={errors.headquarters?.message}>
          {(fieldProps) => (
            <TextInput
              {...form.register('headquarters')}
              {...fieldProps}
              placeholder="Pune, India"
              isInvalid={errors.headquarters !== undefined}
            />
          )}
        </FormField>

        <ChipsField form={form} name="locations" label="Office locations" placeholder="Bengaluru" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SOCIAL_FIELDS.map((field) => (
          <FormField key={field.name} label={field.label} error={errors[field.name]?.message}>
            {(fieldProps) => (
              <TextInput
                {...form.register(field.name)}
                {...fieldProps}
                placeholder={field.placeholder}
                isInvalid={errors[field.name] !== undefined}
              />
            )}
          </FormField>
        ))}
      </div>

      <FormField label="Address" error={errors.address?.message}>
        {(fieldProps) => (
          <TextArea
            {...form.register('address')}
            {...fieldProps}
            rows={2}
            isInvalid={errors.address !== undefined}
          />
        )}
      </FormField>
    </ProfileFormCard>
  );
};
