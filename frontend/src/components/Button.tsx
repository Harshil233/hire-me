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

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-fg-on-brand shadow-sm hover:bg-brand-hover hover:shadow-md active:translate-y-px disabled:bg-brand/50 disabled:shadow-none',
  secondary:
    'border border-border bg-surface text-fg hover:border-border-strong hover:bg-surface-hover active:translate-y-px disabled:text-fg-subtle',
  ghost: 'text-fg-muted hover:bg-surface-hover hover:text-fg disabled:text-fg-subtle',
  danger:
    'bg-danger text-fg-on-brand shadow-sm hover:brightness-110 active:translate-y-px disabled:opacity-50',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-5 py-3 text-base gap-2',
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
      'inline-flex items-center justify-center rounded-[var(--radius-control)] font-medium',
      'transition duration-150 disabled:cursor-not-allowed disabled:active:translate-y-0',
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
