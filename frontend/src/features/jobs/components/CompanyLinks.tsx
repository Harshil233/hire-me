import type { ReactNode } from 'react';

import { FacebookIcon, GlobeIcon, InstagramIcon, LinkedinIcon } from '@/components/icons';
import type { Job } from '../schemas/job.schema';

export interface CompanyLinksProps {
  readonly company: Job['company'];
}

const ICON = 'h-4 w-4';

/**
 * Where a reader goes to check the employer out before applying. Only the links the
 * company actually gave are shown — an icon that leads nowhere is worse than no icon.
 */
export const CompanyLinks = ({ company }: CompanyLinksProps): React.JSX.Element | null => {
  const links: { url: string | undefined; label: string; icon: ReactNode }[] = [
    { url: company.websiteUrl, label: 'Website', icon: <GlobeIcon className={ICON} /> },
    { url: company.linkedinUrl, label: 'LinkedIn', icon: <LinkedinIcon className={ICON} /> },
    { url: company.facebookUrl, label: 'Facebook', icon: <FacebookIcon className={ICON} /> },
    { url: company.instagramUrl, label: 'Instagram', icon: <InstagramIcon className={ICON} /> },
  ];

  const present = links.filter(
    (link): link is { url: string; label: string; icon: ReactNode } =>
      link.url !== undefined && link.url !== '',
  );

  if (present.length === 0) {
    return null;
  }

  return (
    <ul className="flex items-center gap-1.5">
      {present.map((link) => (
        <li key={link.label}>
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`${company.name} on ${link.label}`}
            title={link.label}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-fg-subtle transition hover:border-border-strong hover:bg-surface-hover hover:text-fg"
          >
            {link.icon}
          </a>
        </li>
      ))}
    </ul>
  );
};
