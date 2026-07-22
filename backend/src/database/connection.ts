import mongoose, { type Connection } from 'mongoose';

import type { ILogger } from '../common/types/logger';

export interface DatabaseOptions {
  readonly uri: string;
  readonly dbName: string;
}

/** Connection port so bootstrap and health checks never import Mongoose. */
export interface IDatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  /** `true` when the database answers a ping. */
  isHealthy(): Promise<boolean>;
}

/** Singleton — the connection pool, one of the two permitted singletons (CLAUDE.md §4). */
export class MongooseConnection implements IDatabaseConnection {
  constructor(
    private readonly options: DatabaseOptions,
    private readonly logger: ILogger,
  ) {}

  async connect(): Promise<void> {
    mongoose.set('strictQuery', true);
    await mongoose.connect(this.options.uri, {
      dbName: this.options.dbName,
      serverSelectionTimeoutMS: 10_000,
    });
    this.logger.info('Connected to MongoDB', { dbName: this.options.dbName });
  }

  async disconnect(): Promise<void> {
    await mongoose.disconnect();
    this.logger.info('Disconnected from MongoDB');
  }

  async isHealthy(): Promise<boolean> {
    const admin = mongoose.connection.db?.admin();
    if (admin === undefined) {
      return false;
    }
    try {
      await admin.ping();
      return true;
    } catch {
      return false;
    }
  }
}

/** Raw connection accessor, used only by the transaction manager. */
export const getConnection = (): Connection => mongoose.connection;
