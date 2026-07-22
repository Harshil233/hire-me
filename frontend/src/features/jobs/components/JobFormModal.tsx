import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { ChipsInput } from '@/components/ChipsInput';
import { FormField } from '@/components/FormField';
import { Modal } from '@/components/Modal';
import { Select } from '@/components/Select';
import { TextInput } from '@/components/TextInput';
import {
  JOB_ROLE_LABELS,
  JOB_ROLE_VALUES,
  JOB_TYPE_LABELS,
  JOB_TYPE_VALUES,
  WORK_MODE_LABELS,
  WORK_MODE_VALUES,
} from '@/config/constants';
import { isApiError } from '@/services/api-error';
import { useServerFieldErrors } from '@/features/auth/hooks/useServerFieldErrors';
import { jobFormSchema, type Job, type JobFormValues } from '../schemas/job.schema';

const toOptions = <TValue extends string>(
  values: readonly TValue[],
  labels: Readonly<Record<TValue, string>>,
): readonly { value: string; label: string }[] =>
  values.map((value) => ({ value, label: labels[value] }));

const EMPTY: JobFormValues = {
  title: '',
  description: '',
  role: 'engineering',
  jobType: 'full_time',
  workMode: 'onsite',
  skills: [],
  locations: [],
  ctcMin: '',
  ctcMax: '',
  experienceMinYears: '',
  experienceMaxYears: '',
};

const toFormValues = (job: Job | null): JobFormValues =>
  job === null
    ? EMPTY
    : {
        title: job.title,
        description: job.description,
        role: job.role,
        jobType: job.jobType,
        workMode: job.workMode,
        skills: [...job.skills],
        locations: [...job.locations],
        ctcMin: job.ctcMin === undefined ? '' : String(job.ctcMin),
        ctcMax: job.ctcMax === undefined ? '' : String(job.ctcMax),
        experienceMinYears:
          job.experienceMinYears === undefined ? '' : String(job.experienceMinYears),
        experienceMaxYears:
          job.experienceMaxYears === undefined ? '' : String(job.experienceMaxYears),
      };

export interface JobFormModalProps {
  readonly isOpen: boolean;
  /** `null` opens a blank form; a job opens it for editing. */
  readonly job: Job | null;
  readonly isSaving: boolean;
  readonly error: unknown;
  readonly onSubmit: (values: JobFormValues) => void;
  readonly onClose: () => void;
}

export const JobFormModal = ({
  isOpen,
  job,
  isSaving,
  error,
  onSubmit,
  onClose,
}: JobFormModalProps): React.JSX.Element => {
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: toFormValues(job),
  });

  useServerFieldErrors(error, setError);

  const bannerMessage = isApiError(error) && !error.isValidationError ? error.message : null;

  const submit = handleSubmit((values) => {
    onSubmit(values);
  });

  return (
    <Modal
      isOpen={isOpen}
      title={job === null ? 'Post a job' : 'Edit job'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            isLoading={isSaving}
            onClick={() => {
              void submit();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          void submit(event);
        }}
        noValidate
        className="space-y-4"
      >
        {bannerMessage !== null && <Alert tone="error">{bannerMessage}</Alert>}

        <FormField label="Title" error={errors.title?.message} isRequired>
          {(fieldProps) => (
            <TextInput
              {...register('title')}
              {...fieldProps}
              placeholder="Senior Backend Engineer"
              isInvalid={errors.title !== undefined}
            />
          )}
        </FormField>

        <FormField label="Description" error={errors.description?.message} isRequired>
          {(fieldProps) => (
            <textarea
              {...register('description')}
              {...fieldProps}
              rows={5}
              className="field-control"
              placeholder="What the role involves, and who it suits."
            />
          )}
        </FormField>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Role" error={errors.role?.message} isRequired>
            {(fieldProps) => (
              <Select
                {...register('role')}
                {...fieldProps}
                options={toOptions(JOB_ROLE_VALUES, JOB_ROLE_LABELS)}
              />
            )}
          </FormField>

          <FormField label="Job type" error={errors.jobType?.message} isRequired>
            {(fieldProps) => (
              <Select
                {...register('jobType')}
                {...fieldProps}
                options={toOptions(JOB_TYPE_VALUES, JOB_TYPE_LABELS)}
              />
            )}
          </FormField>

          <FormField label="Work mode" error={errors.workMode?.message} isRequired>
            {(fieldProps) => (
              <Select
                {...register('workMode')}
                {...fieldProps}
                options={toOptions(WORK_MODE_VALUES, WORK_MODE_LABELS)}
              />
            )}
          </FormField>
        </div>

        <FormField label="Skills" error={errors.skills?.message}>
          {(fieldProps) => (
            <Controller
              control={control}
              name="skills"
              render={({ field }) => (
                <ChipsInput
                  id={fieldProps.id}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Add a skill and press Enter"
                />
              )}
            />
          )}
        </FormField>

        <FormField label="Locations" error={errors.locations?.message}>
          {(fieldProps) => (
            <Controller
              control={control}
              name="locations"
              render={({ field }) => (
                <ChipsInput
                  id={fieldProps.id}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Add a location and press Enter"
                />
              )}
            />
          )}
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Minimum CTC" error={errors.ctcMin?.message}>
            {(fieldProps) => (
              <TextInput
                {...register('ctcMin')}
                {...fieldProps}
                inputMode="numeric"
                placeholder="1800000"
                isInvalid={errors.ctcMin !== undefined}
              />
            )}
          </FormField>

          <FormField label="Maximum CTC" error={errors.ctcMax?.message}>
            {(fieldProps) => (
              <TextInput
                {...register('ctcMax')}
                {...fieldProps}
                inputMode="numeric"
                placeholder="2800000"
                isInvalid={errors.ctcMax !== undefined}
              />
            )}
          </FormField>

          <FormField label="Minimum experience (years)" error={errors.experienceMinYears?.message}>
            {(fieldProps) => (
              <TextInput
                {...register('experienceMinYears')}
                {...fieldProps}
                inputMode="numeric"
                placeholder="4"
                isInvalid={errors.experienceMinYears !== undefined}
              />
            )}
          </FormField>

          <FormField label="Maximum experience (years)" error={errors.experienceMaxYears?.message}>
            {(fieldProps) => (
              <TextInput
                {...register('experienceMaxYears')}
                {...fieldProps}
                inputMode="numeric"
                placeholder="8"
                isInvalid={errors.experienceMaxYears !== undefined}
              />
            )}
          </FormField>
        </div>
      </form>
    </Modal>
  );
};
