import { Button } from '@/components/Button';
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
import type { JobFilters as Filters } from '../schemas/job.schema';

const toOptions = <TValue extends string>(
  values: readonly TValue[],
  labels: Readonly<Record<TValue, string>>,
): readonly { value: string; label: string }[] =>
  values.map((value) => ({ value, label: labels[value] }));

const ROLE_OPTIONS = toOptions(JOB_ROLE_VALUES, JOB_ROLE_LABELS);
const JOB_TYPE_OPTIONS = toOptions(JOB_TYPE_VALUES, JOB_TYPE_LABELS);
const WORK_MODE_OPTIONS = toOptions(WORK_MODE_VALUES, WORK_MODE_LABELS);

export interface JobFiltersProps {
  readonly value: Filters;
  readonly onChange: (filters: Filters) => void;
}

/**
 * Presentational filter panel. It owns no state: the page holds the filters so they can
 * live in the URL, and every change resets to page one.
 */
export const JobFiltersPanel = ({ value, onChange }: JobFiltersProps): React.JSX.Element => {
  const set = (patch: Partial<Filters>): void => {
    onChange({ ...value, ...patch, page: 1 });
  };

  const hasFilters = Object.entries(value).some(
    ([key, entry]) => key !== 'page' && entry !== undefined && String(entry) !== '',
  );

  return (
    <aside className="surface-card space-y-4 px-5 py-5" aria-label="Job filters">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
        {hasFilters && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              onChange({ page: 1 });
            }}
          >
            Clear
          </Button>
        )}
      </div>

      <FormField label="Search">
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            value={value.search ?? ''}
            placeholder="Title or description"
            onChange={(event) => {
              set({ search: event.target.value });
            }}
          />
        )}
      </FormField>

      <FormField label="Role">
        {(fieldProps) => (
          <Select
            {...fieldProps}
            options={ROLE_OPTIONS}
            placeholder="Any role"
            value={value.role ?? ''}
            onChange={(event) => {
              set({ role: event.target.value });
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
              set({ jobType: event.target.value });
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
              set({ workMode: event.target.value });
            }}
          />
        )}
      </FormField>

      <FormField label="Location">
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            value={value.location ?? ''}
            placeholder="e.g. Pune"
            onChange={(event) => {
              set({ location: event.target.value });
            }}
          />
        )}
      </FormField>

      <FormField label="Minimum CTC">
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            inputMode="numeric"
            value={value.minCtc ?? ''}
            placeholder="e.g. 1800000"
            onChange={(event) => {
              set({ minCtc: event.target.value });
            }}
          />
        )}
      </FormField>

      <FormField label="My experience (years)">
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            inputMode="numeric"
            value={value.maxExperienceYears ?? ''}
            placeholder="e.g. 5"
            onChange={(event) => {
              set({ maxExperienceYears: event.target.value });
            }}
          />
        )}
      </FormField>
    </aside>
  );
};
