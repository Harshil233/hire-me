import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export type AlertTone = 'error' | 'success' | 'info' | 'warning';

export interface AlertProps {
  readonly tone?: AlertTone;
  readonly title?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

/** Tinted surface plus a solid accent bar, so tone reads even at a glance. */
const TONE_CLASSES: Record<AlertTone, string> = {
  error: 'bg-danger-soft text-fg border-danger/30 before:bg-danger',
  success: 'bg-success-soft text-fg border-success/30 before:bg-success',
  info: 'bg-info-soft text-fg border-info/30 before:bg-info',
  warning: 'bg-warning-soft text-fg border-warning/30 before:bg-warning',
};

export const Alert = ({
  tone = 'info',
  title,
  children,
  className,
}: AlertProps): React.JSX.Element => (
  <div
    role={tone === 'error' ? 'alert' : 'status'}
    className={cn(
      'relative overflow-hidden rounded-[var(--radius-control)] border py-3 pr-4 pl-5 text-sm',
      "before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-['']",
      TONE_CLASSES[tone],
      className,
    )}
  >
    {title !== undefined && <p className="mb-0.5 font-semibold">{title}</p>}
    <div className="text-fg-muted">{children}</div>
  </div>
);
