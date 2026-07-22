/**
 * Unit of work (CLAUDE.md §6). Services receive an opaque `TransactionContext` and
 * hand it to repositories; the driver session never appears in a service signature.
 */
export interface TransactionContext {
  readonly transactionId: string;
}

export interface ITransactionManager {
  runInTransaction<TResult>(work: (context: TransactionContext) => Promise<TResult>): Promise<TResult>;
}
