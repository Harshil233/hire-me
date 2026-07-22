import { NotFoundError } from '../errors/app-error';
import { ERROR_CODES } from '../errors/error-codes';
import type {
  IOwnedResourceRepository,
  IOwnedResourceService,
  OwnedEntity,
} from './owned-resource.types';

/**
 * Business rules shared by every user-owned section. Ownership is enforced here:
 * a record belonging to someone else is reported as *not found*, never as forbidden,
 * so the API cannot be used to probe for other users' data.
 */
export class OwnedResourceService<TEntity extends OwnedEntity, TInput>
  implements IOwnedResourceService<TEntity, TInput>
{
  constructor(
    private readonly repository: IOwnedResourceRepository<TEntity, TInput>,
    private readonly resourceLabel: string,
  ) {}

  list(userId: string): Promise<TEntity[]> {
    return this.repository.listByUser(userId);
  }

  async get(id: string, userId: string): Promise<TEntity> {
    const entity = await this.repository.findByIdForUser(id, userId);

    if (entity === null) {
      throw this.notFound();
    }

    return entity;
  }

  create(userId: string, data: TInput): Promise<TEntity> {
    return this.repository.create(userId, data);
  }

  async update(id: string, userId: string, data: TInput): Promise<TEntity> {
    const updated = await this.repository.update(id, userId, data);

    if (updated === null) {
      throw this.notFound();
    }

    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    const deleted = await this.repository.deleteForUser(id, userId);

    if (!deleted) {
      throw this.notFound();
    }
  }

  countByUser(userId: string): Promise<number> {
    return this.repository.countByUser(userId);
  }

  private notFound(): NotFoundError {
    return new NotFoundError(`${this.resourceLabel} not found`, ERROR_CODES.RESOURCE_NOT_FOUND);
  }
}
