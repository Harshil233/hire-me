import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Express } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

import { createApp } from '../../src/app';
import { env } from '../../src/config/env';
import { createContainer } from '../../src/container';
import { MongooseConnection, getConnection } from '../../src/database/connection';
import { createFakeLogger } from './fakes';

export interface TestServer {
  readonly app: Express;
  /** Empties every collection so each test starts from a clean slate. */
  reset(): Promise<void>;
  stop(): Promise<void>;
}

/**
 * Boots the real application against an in-process MongoDB replica set — a replica set
 * rather than a standalone because HR registration runs in a transaction.
 */
export const startTestServer = async (): Promise<TestServer> => {
  const replSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });

  const uploadsDir = await mkdtemp(join(tmpdir(), 'hire-me-test-uploads-'));
  const logger = createFakeLogger();

  await mongoose.connect(replSet.getUri(), { dbName: 'hire_me_test' });

  const testEnv = { ...env, FILE_STORAGE_PATH: uploadsDir };
  const database = new MongooseConnection(
    { uri: replSet.getUri(), dbName: 'hire_me_test' },
    logger,
  );

  const container = createContainer({
    env: testEnv,
    logger,
    database,
    connection: getConnection(),
  });

  // Indexes back the uniqueness rules the tests assert on.
  await Promise.all(Object.values(mongoose.models).map((model) => model.syncIndexes()));

  return {
    app: createApp({ container, env: testEnv, logger }),

    async reset(): Promise<void> {
      const { collections } = mongoose.connection;
      await Promise.all(
        Object.values(collections).map((collection) => collection.deleteMany({})),
      );
    },

    async stop(): Promise<void> {
      await mongoose.disconnect();
      await replSet.stop();
      await rm(uploadsDir, { recursive: true, force: true });
    },
  };
};
