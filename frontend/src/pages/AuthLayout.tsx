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
 * The brand panel states the product's premise the way the product itself works: as a
 * pay band. Three real bands on a shared axis say "roles are ranges, and you can see
 * them at a glance" before the visitor has read a word.
 */
const SAMPLE_ROLES = [
  { title: 'Senior Backend Engineer', pay: '₹18–28L', start: 34, width: 30 },
  { title: 'Product Designer', pay: '₹15–26L', start: 24, width: 30 },
  { title: 'Data Engineer', pay: '₹19–30L', start: 38, width: 34 },
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
          Every role is a range.
          <br />
          See where yours sits.
        </h2>

        <ul className="mt-10 space-y-5">
          {SAMPLE_ROLES.map((role) => (
            <li key={role.title} className="max-w-md">
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-sm text-fg-muted">{role.title}</span>
                <span className="numeric text-sm text-fg">{role.pay}</span>
              </div>
              <div
                aria-hidden="true"
                className="relative mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-border"
              >
                <span
                  className="absolute inset-y-0 rounded-full bg-accent"
                  style={{ left: `${String(role.start)}%`, width: `${String(role.width)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="max-w-sm text-sm text-fg-subtle">
        Compensation, experience and location up front — on every listing, before you
        click.
      </p>
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

        {footer !== undefined && (
          <div className="mt-8 border-t border-border pt-6">{footer}</div>
        )}
      </div>
    </main>
  </div>
);
