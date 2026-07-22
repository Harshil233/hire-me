import type { Model } from 'mongoose';

import { MongooseOwnedRepository } from '../../common/persistence/mongoose-owned.repository';
import type { EducationDocument } from '../../database/models/education.model';
import type { Education, IEducationRepository } from './education.interface';
import { EDUCATION_FIELDS, type EducationInput } from './education.schema';

export class EducationRepository
  extends MongooseOwnedRepository<Education, EducationDocument, EducationInput>
  implements IEducationRepository
{
  constructor(model: Model<EducationDocument>) {
    super(model, EDUCATION_FIELDS, { startDate: -1 });
  }

  protected toDomain(document: EducationDocument): Education {
    return {
      ...MongooseOwnedRepository.baseFields(document),
      college: document.college,
      course: document.course,
      degree: document.degree,
      description: document.description,
      startDate: document.startDate,
      endDate: document.endDate,
      isCurrent: document.isCurrent,
    };
  }
}
