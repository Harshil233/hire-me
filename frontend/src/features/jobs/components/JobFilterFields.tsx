import { FormField } from '@/components/FormField';
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
import { toggleCsvItem } from '@/lib/csv-list';
import { SkillFilter } from './SkillFilter';
import type { JobFilters } from '../schemas/job.schema';

const toOptions = <TValue extends string>(
  values: readonly TValue[],
  labels: Readonly<Record<TValue, string>>,
): readonly { value: string; label: string }[] =>
  values.map((value) => ({ value, label: labels[value] }));

const ROLE_OPTIONS = toOptions(JOB_ROLE_VALUES, JOB_ROLE_LABELS);
const JOB_TYPE_OPTIONS = toOptions(JOB_TYPE_VALUES, JOB_TYPE_LABELS);
const WORK_MODE_OPTIONS = toOptions(WORK_MODE_VALUES, WORK_MODE_LABELS);

export interface JobFilterFieldsProps {
  readonly value: JobFilters;
  /** The skill vocabulary, fetched by the page so this stays presentational. */
  readonly skills: readonly string[];
  readonly onChange: (filters: JobFilters) => void;
}

/** The controls inside the filter drawer. Purely presentational — the page owns state. */
export const JobFilterFields = ({
  value,
  skills,
  onChange,
}: JobFilterFieldsProps): React.JSX.Element => {
  const set = (patch: Partial<JobFilters>): void => {
    onChange({ ...value, ...patch });
  };

  return (
    <>
      <FormField label="Role">
        {(fieldProps) => (
          <Select
            {...fieldProps}
            options={ROLE_OPTIONS}
            placeholder="Any role"
            value={value.role ?? ''}
            onChange={(event) => {
              set({ role: event.target.value || undefined });
            }}
          />
        )}
      </FormField>

      <FormField label="Job type">
        {(fieldProps) => (
          <Select
            {...fieldProps}
            options={JOB_TYPE_OPTIONS}
            placeholder="Any type"
            value={value.jobType ?? ''}
            onChange={(event) => {
              set({ jobType: event.target.value || undefined });
            }}
          />
        )}
      </FormField>

      <FormField label="Work mode">
        {(fieldProps) => (
          <Select
            {...fieldProps}
            options={WORK_MODE_OPTIONS}
            placeholder="Any mode"
            value={value.workMode ?? ''}
            onChange={(event) => {
              set({ workMode: event.target.value || undefined });
            }}
          />
        )}
      </FormField>

      {skills.length > 0 && (
        <SkillFilter
          skills={skills}
          value={value.skills}
          onToggle={(skill) => {
            set({ skills: toggleCsvItem(value.skills, skill) });
          }}
        />
      )}

      <FormField label="Location">
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            value={value.location ?? ''}
            placeholder="e.g. Pune"
            onChange={(event) => {
              set({ location: event.target.value || undefined });
            }}
          />
        )}
      </FormField>

      <FormField label="Minimum CTC" hint="Annual, in rupees">
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            inputMode="numeric"
            value={value.minCtc ?? ''}
            placeholder="1800000"
            onChange={(event) => {
              set({ minCtc: event.target.value || undefined });
            }}
          />
        )}
      </FormField>

      <FormField label="My experience (years)" hint="Hides roles asking for more">
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            inputMode="numeric"
            value={value.maxExperienceYears ?? ''}
            placeholder="5"
            onChange={(event) => {
              set({ maxExperienceYears: event.target.value || undefined });
            }}
          />
        )}
      </FormField>
    </>
  );
};
