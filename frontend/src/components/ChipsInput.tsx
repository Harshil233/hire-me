import { useState, type KeyboardEvent } from 'react';

import { cn } from '@/lib/cn';

export interface ChipsInputProps {
  readonly id?: string;
  readonly value: readonly string[];
  readonly onChange: (value: string[]) => void;
  readonly placeholder?: string;
  readonly maxItems?: number;
  readonly maxItemLength?: number;
  readonly isInvalid?: boolean;
  readonly 'aria-describedby'?: string | undefined;
}

/**
 * Tag entry for skills and locations. Enter or comma commits a chip; Backspace on an
 * empty field removes the last one. Duplicates are rejected case-insensitively, which
 * mirrors the server-side rule.
 */
export const ChipsInput = ({
  id,
  value,
  onChange,
  placeholder,
  maxItems = 50,
  maxItemLength = 50,
  isInvalid = false,
  'aria-describedby': describedBy,
}: ChipsInputProps): React.JSX.Element => {
  const [draft, setDraft] = useState('');

  const commit = (): void => {
    const candidate = draft.trim().slice(0, maxItemLength);

    if (candidate === '' || value.length >= maxItems) {
      setDraft('');
      return;
    }

    const isDuplicate = value.some((item) => item.toLowerCase() === candidate.toLowerCase());
    if (!isDuplicate) {
      onChange([...value, candidate]);
    }
    setDraft('');
  };

  const remove = (index: number): void => {
    onChange(value.filter((_, position) => position !== index));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit();
      return;
    }

    if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      remove(value.length - 1);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-300 bg-white p-2 shadow-sm',
        'focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-200',
        isInvalid && 'border-red-400 focus-within:border-red-500 focus-within:ring-red-200',
      )}
    >
      {value.map((item, index) => (
        <span
          key={item}
          className="inline-flex items-center gap-1 rounded-md bg-brand-50 py-1 pr-1 pl-2 text-sm font-medium text-brand-700"
        >
          {item}
          <button
            type="button"
            onClick={() => {
              remove(index);
            }}
            aria-label={`Remove ${item}`}
            className="rounded px-1 text-brand-500 transition hover:bg-brand-100 hover:text-brand-800"
          >
            ×
          </button>
        </span>
      ))}

      <input
        id={id}
        type="text"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        maxLength={maxItemLength}
        aria-invalid={isInvalid}
        aria-describedby={describedBy}
        placeholder={value.length >= maxItems ? `Limit of ${maxItems} reached` : placeholder}
        disabled={value.length >= maxItems}
        className="min-w-32 flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
      />
    </div>
  );
};
