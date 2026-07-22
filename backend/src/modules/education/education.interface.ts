import type {
  IOwnedResourceRepository,
  IOwnedResourceService,
  OwnedEntity,
} from '../../common/persistence/owned-resource.types';
import { createToken, type Token } from '../../container/token';
import type { EducationInput } from './education.schema';

export interface Education extends OwnedEntity {
  readonly college: string;
  readonly course: string;
  readonly degree: string;
  readonly description?: string | undefined;
  readonly startDate: Date;
  readonly endDate?: Date | undefined;
  readonly isCurrent: boolean;
}

export type IEducationRepository = IOwnedResourceRepository<Education, EducationInput>;
export type IEducationService = IOwnedResourceService<Education, EducationInput>;

export const EDUCATION_REPOSITORY: Token<IEducationRepository> =
  createToken('IEducationRepository');
export const EDUCATION_SERVICE: Token<IEducationService> = createToken('IEducationService');
