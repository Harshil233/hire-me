import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  /** Shows a spinner and blocks interaction while a request is in flight. */
  readonly isLoading?: boolean;
  readonly leadingIcon?: ReactNode;
  readonly children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:text-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leadingIcon,
  children,
  className,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps): React.JSX.Element => (
  <button
    type={type}
    disabled={disabled === true || isLoading}
    aria-busy={isLoading}
    className={cn(
      'inline-flex items-center justify-center rounded-lg font-medium transition',
      'disabled:cursor-not-allowed',
      VARIANT_CLASSES[variant],
      SIZE_CLASSES[size],
      className,
    )}
    {...rest}
  >
    {isLoading ? <Spinner size="sm" /> : leadingIcon}
    {children}
  </button>
);
