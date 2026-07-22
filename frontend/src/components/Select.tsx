import { forwardRef, type SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export interface SelectOption {
  readonly value: string;
  readonly label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly options: readonly SelectOption[];
  readonly placeholder?: string;
  readonly isInvalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, placeholder, isInvalid = false, className, ...rest }, ref) => (
    <select
      ref={ref}
      className={cn('field-control', isInvalid && 'field-control-invalid', className)}
      {...rest}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
);
Select.displayName = 'Select';
