import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { createContainer } from './container';
import { MongooseConnection, getConnection } from './database/connection';

/** Bootstrap only: connect, listen, shut down cleanly. */
const bootstrap = async (): Promise<void> => {
  const database = new MongooseConnection(
    { uri: env.MONGO_URI, dbName: env.MONGO_DB_NAME },
    logger,
  );

  await database.connect();

  const container = createContainer({
    env,
    logger,
    database,
    connection: getConnection(),
  });

  const app = createApp({ container, env, logger });
  const server = app.listen(env.PORT, () => {
    logger.info('API listening', { port: env.PORT, environment: env.NODE_ENV });
  });

  const shutdown = (signal: string): void => {
    logger.info('Shutting down', { signal });
    server.close(() => {
      void database.disconnect().finally(() => {
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', () => {
    shutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    shutdown('SIGINT');
  });
};

bootstrap().catch((error: unknown) => {
  logger.error('Failed to start the API', {
    reason: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
