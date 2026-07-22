import type { Model } from 'mongoose';

import { MongooseOwnedRepository } from '../../common/persistence/mongoose-owned.repository';
import type { ExperienceDocument } from '../../database/models/experience.model';
import type { Experience, IExperienceRepository } from './experience.interface';
import { EXPERIENCE_FIELDS, type ExperienceInput } from './experience.schema';

export class ExperienceRepository
  extends MongooseOwnedRepository<Experience, ExperienceDocument, ExperienceInput>
  implements IExperienceRepository
{
  constructor(model: Model<ExperienceDocument>) {
    super(model, EXPERIENCE_FIELDS, { startDate: -1 });
  }

  protected toDomain(document: ExperienceDocument): Experience {
    return {
      ...MongooseOwnedRepository.baseFields(document),
      title: document.title,
      companyName: document.companyName,
      description: document.description,
      startDate: document.startDate,
      endDate: document.endDate,
      isCurrent: document.isCurrent,
      skills: document.skills,
    };
  }
}
