import { useId, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface FormFieldProps {
  readonly label: string;
  readonly error?: string | undefined;
  readonly hint?: string | undefined;
  readonly isRequired?: boolean;
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
      <label htmlFor={id} className="field-label">
        {label}
        {isRequired && (
          <span aria-hidden="true" className="ml-0.5 text-danger">
            *
          </span>
        )}
      </label>

      {children({
        id,
        'aria-invalid': error !== undefined,
        'aria-describedby': describedBy.length > 0 ? describedBy : undefined,
      })}

      {hint !== undefined && error === undefined && (
        <p id={hintId} className="mt-1.5 text-xs text-fg-muted">
          {hint}
        </p>
      )}

      {error !== undefined && (
        <p id={errorId} className="field-error">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
