import { ConflictError, NotFoundError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import type { IUserRepository, IUserService, User } from './user.interface';

/**
 * Account-level rules shared by auth and profile. Holds no HTTP or persistence
 * knowledge — it depends on the repository interface only.
 */
export class UserService implements IUserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async getById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (user === null) {
      throw new NotFoundError('User not found', ERROR_CODES.USER_NOT_FOUND);
    }

    return user;
  }

  async assertEmailAvailable(email: string): Promise<void> {
    const taken = await this.userRepository.existsByEmail(email);

    if (taken) {
      throw new ConflictError(
        'An account with this email already exists',
        ERROR_CODES.EMAIL_ALREADY_EXISTS,
      );
    }
  }
}
