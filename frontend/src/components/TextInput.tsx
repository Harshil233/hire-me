import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly isInvalid?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ isInvalid = false, className, ...rest }, ref) => (
    <input
      ref={ref}
      className={cn('field-control', isInvalid && 'field-control-invalid', className)}
      {...rest}
    />
  ),
);
TextInput.displayName = 'TextInput';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  readonly isInvalid?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ isInvalid = false, className, rows = 4, ...rest }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn('field-control resize-y', isInvalid && 'field-control-invalid', className)}
      {...rest}
    />
  ),
);
TextArea.displayName = 'TextArea';
