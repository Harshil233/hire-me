import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MongooseConnection, getConnection } from '../../src/database/connection';
import {
  MongooseTransactionContext,
  MongooseTransactionManager,
  getSession,
} from '../../src/database/mongoose-transaction-manager';
import { UserModel } from '../../src/database/models/user.model';
import { createFakeLogger } from '../helpers/fakes';

let replSet: MongoMemoryReplSet;
let connection: MongooseConnection;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await replSet.stop();
});

describe('MongooseConnection', () => {
  it('reports unhealthy before a connection exists', async () => {
    connection = new MongooseConnection(
      { uri: replSet.getUri(), dbName: 'hire_me_db_test' },
      createFakeLogger(),
    );

    await expect(connection.isHealthy()).resolves.toBe(false);
  });

  it('connects and then reports healthy', async () => {
    const logger = createFakeLogger();
    connection = new MongooseConnection(
      { uri: replSet.getUri(), dbName: 'hire_me_db_test' },
      logger,
    );

    await connection.connect();

    expect(logger.info).toHaveBeenCalledWith('Connected to MongoDB', {
      dbName: 'hire_me_db_test',
    });
    await expect(connection.isHealthy()).resolves.toBe(true);
  });

  it('exposes the live connection for the transaction manager', () => {
    expect(getConnection().readyState).toBe(1);
  });

  it('disconnects and reports unhealthy again', async () => {
    const logger = createFakeLogger();
    const disconnecting = new MongooseConnection(
      { uri: replSet.getUri(), dbName: 'hire_me_db_test' },
      logger,
    );

    await disconnecting.connect();
    await disconnecting.disconnect();

    expect(logger.info).toHaveBeenCalledWith('Disconnected from MongoDB');
    await expect(disconnecting.isHealthy()).resolves.toBe(false);

    await connection.connect();
  });
});

describe('MongooseTransactionManager', () => {
  it('commits the work and returns its result', async () => {
    const manager = new MongooseTransactionManager(getConnection(), () => 'txn-1');

    const result = await manager.runInTransaction(async (context) => {
      expect(context.transactionId).toBe('txn-1');
      await UserModel.create(
        [
          {
            email: 'committed@example.com',
            passwordHash: 'hash',
            role: 'candidate',
            isActive: true,
          },
        ],
        { session: getSession(context) },
      );
      return 'done';
    });

    expect(result).toBe('done');
    expect(await UserModel.countDocuments({ email: 'committed@example.com' })).toBe(1);
  });

  it('rolls every write back when the work throws', async () => {
    const manager = new MongooseTransactionManager(getConnection());

    await expect(
      manager.runInTransaction(async (context) => {
        await UserModel.create(
          [
            {
              email: 'rolled-back@example.com',
              passwordHash: 'hash',
              role: 'candidate',
              isActive: true,
            },
          ],
          { session: getSession(context) },
        );
        throw new Error('business rule failed');
      }),
    ).rejects.toThrow('business rule failed');

    expect(await UserModel.countDocuments({ email: 'rolled-back@example.com' })).toBe(0);
  });
});

describe('getSession', () => {
  it('returns undefined outside a transaction', () => {
    expect(getSession()).toBeUndefined();
    expect(getSession({ transactionId: 'foreign-context' })).toBeUndefined();
  });

  it('unwraps the driver session from its own context', async () => {
    const session = await getConnection().startSession();
    const context = new MongooseTransactionContext('txn-1', session);

    expect(getSession(context)).toBe(session);
    await session.endSession();
  });
});
