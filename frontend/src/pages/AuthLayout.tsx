import type { ReactNode } from 'react';

export interface AuthLayoutProps {
  readonly title: string;
  readonly subtitle: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  readonly wide?: boolean;
}

/** Centred card shell shared by the sign-in and sign-up screens. */
export const AuthLayout = ({
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: AuthLayoutProps): React.JSX.Element => (
  <div className="flex min-h-full flex-col items-center justify-center px-4 py-10">
    <div className={wide ? 'w-full max-w-2xl' : 'w-full max-w-md'}>
      <div className="mb-6 text-center">
        <p className="text-2xl font-bold tracking-tight text-brand-700">Hire Me</p>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="surface-card p-6 sm:p-8">{children}</div>

      {footer !== undefined && <div className="mt-5 text-center">{footer}</div>}
    </div>
  </div>
);
