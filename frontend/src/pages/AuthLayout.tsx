import type { ReactNode } from 'react';

import { BriefcaseIcon, CheckIcon, SparkleIcon } from '@/components/icons';
import { ThemeToggle } from '@/features/theme/ThemeToggle';

export interface AuthLayoutProps {
  readonly title: string;
  readonly subtitle: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly wide?: boolean;
}

const HIGHLIGHTS = [
  'One profile, every application',
  'Filter roles by pay, mode and skills',
  'Track every application in one place',
];

/**
 * Split shell for sign-in and sign-up: a brand panel that sets the tone on large
 * screens, and the form itself. The panel collapses away below `lg` so small screens
 * get straight to the form rather than a wall of marketing.
 */
export const AuthLayout = ({
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: AuthLayoutProps): React.JSX.Element => (
  <div className="relative min-h-screen lg:grid lg:grid-cols-[1.05fr_1fr]">
    {/* ---------------------------------------------------------- brand panel */}
    <aside className="relative hidden overflow-hidden bg-bg-subtle lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div className="aurora" />

      <div className="relative">
        <span className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-fg">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-fg-on-brand shadow-[var(--shadow-glow)]">
            <BriefcaseIcon className="h-5 w-5" />
          </span>
          Hire&nbsp;Me
        </span>
      </div>

      <div className="relative max-w-md">
        <h2 className="text-4xl leading-tight font-bold tracking-tight text-fg">
          Where good work
          <br />
          <span className="brand-gradient-text">finds good people.</span>
        </h2>
        <p className="mt-4 text-base leading-relaxed text-fg-muted">
          A job portal built for both sides of the table — candidates looking for their next
          role, and the teams hoping to meet them.
        </p>

        <ul className="mt-8 space-y-3">
          {HIGHLIGHTS.map((highlight) => (
            <li key={highlight} className="flex items-center gap-3 text-sm text-fg-muted">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-text">
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
              {highlight}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative flex items-center gap-2 text-sm text-fg-subtle">
        <SparkleIcon className="h-4 w-4" />
        Built for candidates and employers alike.
      </p>
    </aside>

    {/* ----------------------------------------------------------- form panel */}
    <main className="relative flex min-h-screen flex-col justify-center px-5 py-10 sm:px-8 lg:px-14">
      <div className="absolute top-5 right-5 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className={`mx-auto w-full ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        {/* The wordmark only appears here once the brand panel is hidden. */}
        <span className="mb-8 inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-fg lg:hidden">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-fg-on-brand">
            <BriefcaseIcon className="h-5 w-5" />
          </span>
          Hire&nbsp;Me
        </span>

        <header className="mb-7">
          <h1 className="text-3xl font-bold tracking-tight text-fg">{title}</h1>
          <p className="mt-2 text-sm text-fg-muted">{subtitle}</p>
        </header>

        {children}

        {footer !== undefined && <div className="mt-7">{footer}</div>}
      </div>
    </main>
  </div>
);
