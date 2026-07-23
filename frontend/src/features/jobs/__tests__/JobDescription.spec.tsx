import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CompanyLinks } from '../components/CompanyLinks';
import { JobBulletSection } from '../components/JobBulletSection';
import { job } from '@/test/fixtures';

const companyWith = (links: Partial<ReturnType<typeof job>['company']>) => ({
  ...job().company,
  ...links,
});

describe('JobBulletSection', () => {
  it('heads the list and renders every point', () => {
    render(<JobBulletSection title="Responsibilities" items={['Own the API', 'Review code']} />);

    expect(screen.getByRole('heading', { name: 'Responsibilities' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders nothing when the employer left the section out', () => {
    const { container } = render(<JobBulletSection title="Responsibilities" items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('CompanyLinks', () => {
  it('links out to each network the company gave', () => {
    render(
      <CompanyLinks
        company={companyWith({
          linkedinUrl: 'https://linkedin.com/company/acme',
          instagramUrl: 'https://instagram.com/acme',
        })}
      />,
    );

    expect(screen.getByRole('link', { name: /on LinkedIn/ })).toHaveAttribute(
      'href',
      'https://linkedin.com/company/acme',
    );
    expect(screen.getByRole('link', { name: /on Instagram/ })).toBeInTheDocument();
  });

  it('leaves out a network the company does not have', () => {
    render(<CompanyLinks company={companyWith({ linkedinUrl: 'https://linkedin.com/x' })} />);

    expect(screen.queryByRole('link', { name: /on Instagram/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /on Facebook/ })).not.toBeInTheDocument();
  });

  it('opens in a new tab without handing over the referrer', () => {
    render(<CompanyLinks company={companyWith({ websiteUrl: 'https://acme.test' })} />);
    const link = screen.getByRole('link', { name: /on Website/ });

    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('renders nothing for a company with no links at all', () => {
    const { container } = render(<CompanyLinks company={companyWith({})} />);

    expect(container).toBeEmptyDOMElement();
  });
});
