import type { Certification } from './certification.interface';
import type { CertificationResponse } from './certification.schema';

export const toCertificationResponse = (
  certification: Certification,
): CertificationResponse => ({
  id: certification.id,
  title: certification.title,
  issuedBy: certification.issuedBy,
  issuedOn: certification.issuedOn.toISOString(),
  expiresOn: certification.expiresOn?.toISOString(),
  credentialUrl: certification.credentialUrl,
  description: certification.description,
  createdAt: certification.createdAt.toISOString(),
  updatedAt: certification.updatedAt.toISOString(),
});
