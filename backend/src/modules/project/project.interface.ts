import type {
  IOwnedResourceRepository,
  IOwnedResourceService,
  OwnedEntity,
} from '../../common/persistence/owned-resource.types';
import { createToken, type Token } from '../../container/token';
import type { ProjectInput } from './project.schema';

export interface Project extends OwnedEntity {
  readonly title: string;
  readonly description?: string | undefined;
  readonly skills: readonly string[];
  readonly domain?: string | undefined;
  readonly link?: string | undefined;
  readonly startDate: Date;
  readonly endDate?: Date | undefined;
  readonly isCurrent: boolean;
}

export type IProjectRepository = IOwnedResourceRepository<Project, ProjectInput>;
export type IProjectService = IOwnedResourceService<Project, ProjectInput>;

export const PROJECT_REPOSITORY: Token<IProjectRepository> = createToken('IProjectRepository');
export const PROJECT_SERVICE: Token<IProjectService> = createToken('IProjectService');
