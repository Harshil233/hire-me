import { PAGINATION } from '../../config/constants';
import { toPaginationMeta } from '../../common/http/api-response';
import type { TransactionContext } from '../../common/persistence/transaction.types';
import type {
  CreateNotificationData,
  INotificationRepository,
  INotificationService,
  Notification,
  NotificationListResult,
} from './notification.interface';
import type { NotificationQueryInput } from './notification.schema';

export class NotificationService implements INotificationService {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly now: () => Date,
  ) {}

  async notify(
    data: CreateNotificationData,
    context?: TransactionContext,
  ): Promise<Notification> {
    return this.notificationRepository.create(data, context);
  }

  async list(userId: string, query: NotificationQueryInput): Promise<NotificationListResult> {
    const page = query.page || PAGINATION.DEFAULT_PAGE;
    const pageSize = query.pageSize || PAGINATION.DEFAULT_PAGE_SIZE;

    const [result, unreadCount] = await Promise.all([
      this.notificationRepository.listForUser(userId, page, pageSize),
      this.notificationRepository.countUnread(userId),
    ]);

    return {
      notifications: result.items,
      unreadCount,
      pagination: toPaginationMeta(result.total, page, pageSize),
    };
  }

  /** Scoped to the caller in the repository, so an id they do not own marks nothing. */
  async markRead(userId: string, id?: string): Promise<number> {
    return this.notificationRepository.markRead(userId, this.now(), id);
  }
}
