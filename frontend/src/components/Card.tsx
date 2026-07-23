import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface CardProps {
  readonly title?: string;
  readonly description?: string;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly id?: string;
}

export const Card = ({
  title,
  description,
  actions,
  children,
  className,
  id,
}: CardProps): React.JSX.Element => (
  <section id={id} className={cn('surface-card', className)}>
    {(title !== undefined || actions !== undefined) && (
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-6 py-4">
        <div>
          {title !== undefined && (
            <h2 className="text-base font-semibold tracking-tight text-fg">{title}</h2>
          )}
          {description !== undefined && (
            <p className="mt-0.5 text-sm text-fg-muted">{description}</p>
          )}
        </div>
        {actions}
      </header>
    )}
    <div className="px-6 py-5">{children}</div>
  </section>
);

export interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly icon?: ReactNode;
}

export const EmptyState = ({
  title,
  description,
  action,
  icon,
}: EmptyStateProps): React.JSX.Element => (
  <div className="rounded-[var(--radius-card)] border border-dashed border-border-strong bg-surface-inset px-6 py-12 text-center">
    {icon !== undefined && (
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand-text">
        {icon}
      </div>
    )}
    <p className="text-base font-semibold text-fg">{title}</p>
    {description !== undefined && (
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-fg-muted">{description}</p>
    )}
    {action !== undefined && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);
