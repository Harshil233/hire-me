import { FormField } from '@/components/FormField';
import { Select } from '@/components/Select';
import { TextInput } from '@/components/TextInput';
import { JOB_TYPE_LABELS, JOB_TYPE_VALUES } from '@/config/constants';
import type { CandidateFilters } from '../schemas/candidate.schema';

const JOB_TYPE_OPTIONS = JOB_TYPE_VALUES.map((type) => ({
  value: type,
  label: JOB_TYPE_LABELS[type],
}));

export interface CandidateFilterFieldsProps {
  readonly value: CandidateFilters;
  readonly onChange: (next: CandidateFilters) => void;
}

/**
 * The talent-pool filters, in one place so the drawer on a phone and the rail on a wide
 * screen are the same controls rather than two copies (CLAUDE.md §9).
 */
export const CandidateFilterFields = ({
  value,
  onChange,
}: CandidateFilterFieldsProps): React.JSX.Element => (
  <>
    <FormField label="Skills" hint="Comma separated">
      {(fieldProps) => (
        <TextInput
          {...fieldProps}
          value={value.skills ?? ''}
          placeholder="TypeScript, React"
          onChange={(event) => {
            onChange({ ...value, skills: event.target.value || undefined });
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
            onChange({ ...value, location: event.target.value || undefined });
          }}
        />
      )}
    </FormField>

    <FormField label="Open to">
      {(fieldProps) => (
        <Select
          {...fieldProps}
          options={JOB_TYPE_OPTIONS}
          placeholder="Any job type"
          value={value.jobType ?? ''}
          onChange={(event) => {
            onChange({ ...value, jobType: event.target.value || undefined });
          }}
        />
      )}
    </FormField>
  </>
);
