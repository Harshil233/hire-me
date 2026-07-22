import type { Model } from 'mongoose';

import { MongooseOwnedRepository } from '../../common/persistence/mongoose-owned.repository';
import type { ProjectDocument } from '../../database/models/project.model';
import type { IProjectRepository, Project } from './project.interface';
import { PROJECT_FIELDS, type ProjectInput } from './project.schema';

export class ProjectRepository
  extends MongooseOwnedRepository<Project, ProjectDocument, ProjectInput>
  implements IProjectRepository
{
  constructor(model: Model<ProjectDocument>) {
    super(model, PROJECT_FIELDS, { startDate: -1 });
  }

  protected toDomain(document: ProjectDocument): Project {
    return {
      ...MongooseOwnedRepository.baseFields(document),
      title: document.title,
      description: document.description,
      skills: document.skills,
      domain: document.domain,
      link: document.link,
      startDate: document.startDate,
      endDate: document.endDate,
      isCurrent: document.isCurrent,
    };
  }
}
