import { useId, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface FormFieldProps {
  readonly label: string;
  readonly error?: string | undefined;
  /** Sits on the label row, not under the control, so fields keep a uniform height. */
  readonly hint?: string | undefined;
  readonly isRequired?: boolean;
  /** Marks the field optional in the label itself rather than in a line below it. */
  readonly isOptional?: boolean;
  readonly className?: string;
  /**
   * Receives the wiring a control needs to be announced correctly by screen readers.
   */
  readonly children: (props: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
}

/**
 * Owns label/description/error wiring so no control has to repeat the accessibility
 * plumbing (CLAUDE.md §9, §10).
 */
export const FormField = ({
  label,
  error,
  hint,
  isRequired = false,
  isOptional = false,
  className,
  children,
}: FormFieldProps): React.JSX.Element => {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error !== undefined ? errorId : null, hint !== undefined ? hintId : null]
    .filter((value): value is string => value !== null)
    .join(' ');

  return (
    <div className={cn('w-full', className)}>
      {/*
        Label, optionality and hint share one row. Putting the hint under the control
        made every field a different height, so a two-column form never lined up.
      */}
      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <label htmlFor={id} className="field-label mb-0">
          {label}
          {isRequired && (
            <span aria-hidden="true" className="ml-0.5 text-danger">
              *
            </span>
          )}
          {isOptional && <span className="ml-1.5 font-normal text-fg-subtle">(optional)</span>}
        </label>

        {/* Wraps onto its own line in a narrow column rather than colliding with the label. */}
        {hint !== undefined && (
          <span id={hintId} className="text-xs text-fg-subtle">
            {hint}
          </span>
        )}
      </div>

      {children({
        id,
        'aria-invalid': error !== undefined,
        'aria-describedby': describedBy.length > 0 ? describedBy : undefined,
      })}

      {error !== undefined && (
        <p id={errorId} className="field-error">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
