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
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          {title !== undefined && (
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          )}
          {description !== undefined && (
            <p className="mt-0.5 text-sm text-slate-500">{description}</p>
          )}
        </div>
        {actions}
      </header>
    )}
    <div className="px-5 py-5">{children}</div>
  </section>
);

export interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
}

export const EmptyState = ({ title, description, action }: EmptyStateProps): React.JSX.Element => (
  <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center">
    <p className="text-sm font-medium text-slate-700">{title}</p>
    {description !== undefined && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    {action !== undefined && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);
