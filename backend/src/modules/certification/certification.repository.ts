import type { Model } from 'mongoose';

import { MongooseOwnedRepository } from '../../common/persistence/mongoose-owned.repository';
import type { CertificationDocument } from '../../database/models/certification.model';
import type { Certification, ICertificationRepository } from './certification.interface';
import { CERTIFICATION_FIELDS, type CertificationInput } from './certification.schema';

export class CertificationRepository
  extends MongooseOwnedRepository<Certification, CertificationDocument, CertificationInput>
  implements ICertificationRepository
{
  constructor(model: Model<CertificationDocument>) {
    super(model, CERTIFICATION_FIELDS, { issuedOn: -1 });
  }

  protected toDomain(document: CertificationDocument): Certification {
    return {
      ...MongooseOwnedRepository.baseFields(document),
      title: document.title,
      issuedBy: document.issuedBy,
      issuedOn: document.issuedOn,
      expiresOn: document.expiresOn,
      credentialUrl: document.credentialUrl,
      description: document.description,
    };
  }
}
