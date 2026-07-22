import type {
  IOwnedResourceRepository,
  IOwnedResourceService,
  OwnedEntity,
} from '../../common/persistence/owned-resource.types';
import { createToken, type Token } from '../../container/token';
import type { ExperienceInput } from './experience.schema';

export interface Experience extends OwnedEntity {
  readonly title: string;
  readonly companyName: string;
  readonly description?: string | undefined;
  readonly startDate: Date;
  readonly endDate?: Date | undefined;
  readonly isCurrent: boolean;
  readonly skills: readonly string[];
}

export type IExperienceRepository = IOwnedResourceRepository<Experience, ExperienceInput>;
export type IExperienceService = IOwnedResourceService<Experience, ExperienceInput>;

export const EXPERIENCE_REPOSITORY: Token<IExperienceRepository> =
  createToken('IExperienceRepository');
export const EXPERIENCE_SERVICE: Token<IExperienceService> = createToken('IExperienceService');
