import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type AlertTone = 'error' | 'success' | 'info' | 'warning';

export interface AlertProps {
  readonly tone?: AlertTone;
  readonly title?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

const TONE_CLASSES: Record<AlertTone, string> = {
  error: 'border-red-200 bg-red-50 text-red-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  info: 'border-brand-200 bg-brand-50 text-brand-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
};

export const Alert = ({
  tone = 'info',
  title,
  children,
  className,
}: AlertProps): React.JSX.Element => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={cn('rounded-lg border px-4 py-3 text-sm', TONE_CLASSES[tone], className)}
  >
    {title !== undefined && <p className="mb-0.5 font-semibold">{title}</p>}
    <div>{children}</div>
  </div>
);
