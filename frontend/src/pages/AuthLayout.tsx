import type { ReactNode } from 'react';

import { ThemeToggle } from '@/features/theme/ThemeToggle';

export interface AuthLayoutProps {
  readonly title: string;
  readonly subtitle: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly wide?: boolean;
}

/**
 * What each side of the product is for. Plain claims about how it works — the panel used
 * to illustrate the point with three specimen listings and their pay, which read as real
 * openings to anyone who had not signed in yet. Nothing here is invented.
 */
const AUDIENCES = [
  {
    heading: 'Looking for a role',
    body: 'Filter by pay, experience, location and work mode, then track every application in one place.',
  },
  {
    heading: 'Hiring for one',
    body: 'Post an opening, search the talent pool, and shortlist from a single view of each candidate.',
  },
];

export const AuthLayout = ({
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: AuthLayoutProps): React.JSX.Element => (
  <div className="min-h-screen lg:grid lg:grid-cols-[1fr_1.05fr]">
    {/* ---------------------------------------------------------- brand panel */}
    <aside className="relative hidden overflow-hidden bg-bg-subtle lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <span className="flex items-center gap-2.5">
        <span className="h-6 w-1.5 rounded-full bg-accent" />
        <span className="font-display text-lg font-semibold tracking-tight text-fg">
          Hire&nbsp;Me
        </span>
      </span>

      <div className="max-w-lg">
        <p className="eyebrow">Two sides, one shortlist</p>
        <h2 className="mt-4 font-display text-[2.75rem] leading-[1.05] font-semibold tracking-tight text-fg xl:text-[3.25rem]">
          Find the role.
          <br />
          Or find the person.
        </h2>

        <ul className="mt-10 space-y-6">
          {AUDIENCES.map((audience) => (
            <li key={audience.heading} className="max-w-md border-l-2 border-accent-line pl-4">
              <p className="text-sm font-medium text-fg">{audience.heading}</p>
              <p className="mt-1 text-sm text-fg-muted">{audience.body}</p>
            </li>
          ))}
        </ul>
      </div>

      <p className="max-w-sm text-sm text-fg-subtle">One account, whichever side you are on.</p>
    </aside>

    {/* ----------------------------------------------------------- form panel */}
    <main className="relative flex min-h-screen flex-col justify-center px-5 py-10 sm:px-10 lg:px-16">
      <div className="absolute top-5 right-5 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className={`mx-auto w-full ${wide ? 'max-w-xl' : 'max-w-sm'}`}>
        <span className="mb-10 flex items-center gap-2.5 lg:hidden">
          <span className="h-5 w-1.5 rounded-full bg-accent" />
          <span className="font-display text-base font-semibold tracking-tight text-fg">
            Hire&nbsp;Me
          </span>
        </span>

        <header className="mb-8">
          <h1 className="font-display text-[2rem] leading-none font-semibold tracking-tight text-fg">
            {title}
          </h1>
          <p className="mt-2.5 text-sm text-fg-muted">{subtitle}</p>
        </header>

        {children}

        {footer !== undefined && <div className="mt-8 border-t border-border pt-6">{footer}</div>}
      </div>
    </main>
  </div>
);
