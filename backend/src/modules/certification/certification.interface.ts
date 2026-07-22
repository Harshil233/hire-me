import type {
  IOwnedResourceRepository,
  IOwnedResourceService,
  OwnedEntity,
} from '../../common/persistence/owned-resource.types';
import { createToken, type Token } from '../../container/token';
import type { CertificationInput } from './certification.schema';

export interface Certification extends OwnedEntity {
  readonly title: string;
  readonly issuedBy: string;
  readonly issuedOn: Date;
  readonly expiresOn?: Date | undefined;
  readonly credentialUrl?: string | undefined;
  readonly description?: string | undefined;
}

export type ICertificationRepository = IOwnedResourceRepository<Certification, CertificationInput>;
export type ICertificationService = IOwnedResourceService<Certification, CertificationInput>;

export const CERTIFICATION_REPOSITORY: Token<ICertificationRepository> = createToken(
  'ICertificationRepository',
);
export const CERTIFICATION_SERVICE: Token<ICertificationService> =
  createToken('ICertificationService');
