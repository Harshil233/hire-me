import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  /** Shows a spinner and blocks interaction while a request is in flight. */
  readonly isLoading?: boolean;
  readonly leadingIcon?: ReactNode;
  readonly children: ReactNode;
}

/**
 * Primary is ink on paper (and paper on ink after dark) — always the highest contrast
 * thing available. Marigold is never a button: it stays the accent, so it keeps its
 * meaning wherever it does appear.
 */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-fg-on-brand hover:bg-brand-hover disabled:opacity-45',
  secondary:
    'border border-border bg-surface text-fg hover:border-border-strong hover:bg-surface-hover disabled:text-fg-subtle',
  ghost: 'text-fg-muted hover:bg-surface-hover hover:text-fg disabled:text-fg-subtle',
  danger: 'bg-danger text-fg-on-brand hover:brightness-110 disabled:opacity-45',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[0.8125rem] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-[0.9375rem] gap-2',
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
      'inline-flex items-center justify-center rounded-[var(--radius-control)] font-medium whitespace-nowrap',
      'transition-colors duration-150 disabled:cursor-not-allowed',
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
