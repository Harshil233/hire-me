import type { IUserEmailDirectory } from '../outreach/outreach.interface';
import type { IUserRepository } from './user.interface';

/**
 * Adapter implementing the outreach module's email port on top of the user repository.
 *
 * The address is looked up at the moment of sending and never handed to a browser or
 * copied into an outreach record — which is what lets an employer mail the talent pool
 * without any candidate's email address leaving the server.
 */
export class UserEmailDirectoryAdapter implements IUserEmailDirectory {
  constructor(private readonly repository: IUserRepository) {}

  async findEmails(userIds: readonly string[]): Promise<ReadonlyMap<string, string>> {
    const unique = [...new Set(userIds)];
    const users = await this.repository.findManyByIds(unique);

    return new Map(users.filter((user) => user.isActive).map((user) => [user.id, user.email]));
  }
}
