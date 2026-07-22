import type { Company } from './company.interface';
import type { CompanyResponse } from './company.schema';

/**
 * Domain → HTTP response. Shared by the company controller and the HR profile
 * presenter so the wire shape is defined once (CLAUDE.md §9).
 */
export const toCompanyResponse = (company: Company): CompanyResponse => ({
  id: company.id,
  name: company.name,
  slug: company.slug,
  description: company.description,
  locations: [...company.locations],
  headquarters: company.headquarters,
  domain: company.domain,
  logoFileId: company.logoFileId,
  websiteUrl: company.websiteUrl,
  linkedinUrl: company.linkedinUrl,
  facebookUrl: company.facebookUrl,
  instagramUrl: company.instagramUrl,
  googleMapsLink: company.googleMapsLink,
  address: company.address,
  createdAt: company.createdAt.toISOString(),
  updatedAt: company.updatedAt.toISOString(),
});
