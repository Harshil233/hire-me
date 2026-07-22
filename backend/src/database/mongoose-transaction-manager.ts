import { randomUUID } from 'node:crypto';

import type { ClientSession, Connection } from 'mongoose';

import type {
  ITransactionManager,
  TransactionContext,
} from '../common/persistence/transaction.types';

/** Carries the driver session while presenting only the opaque context to services. */
export class MongooseTransactionContext implements TransactionContext {
  constructor(
    public readonly transactionId: string,
    public readonly session: ClientSession,
  ) {}
}

/**
 * Narrows an opaque context back to a driver session. Only repositories call this —
 * it is the boundary where the abstraction is unwrapped.
 */
export const getSession = (context?: TransactionContext): ClientSession | undefined =>
  context instanceof MongooseTransactionContext ? context.session : undefined;

export class MongooseTransactionManager implements ITransactionManager {
  constructor(
    private readonly connection: Connection,
    private readonly generateId: () => string = randomUUID,
  ) {}

  async runInTransaction<TResult>(
    work: (context: TransactionContext) => Promise<TResult>,
  ): Promise<TResult> {
    const session = await this.connection.startSession();

    try {
      return await session.withTransaction(async () =>
        work(new MongooseTransactionContext(this.generateId(), session)),
      );
    } finally {
      await session.endSession();
    }
  }
}
