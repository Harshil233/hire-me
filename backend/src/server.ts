import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { createContainer } from './container';
import { MongooseConnection, getConnection } from './database/connection';
import { OUTREACH_DISPATCHER } from './modules/outreach/outreach.interface';
import { startOutreachWorker } from './modules/outreach/outreach.worker';

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

  // Campaigns are queued by the request and sent here, out of its way.
  const outreach = startOutreachWorker(container.resolve(OUTREACH_DISPATCHER), logger);

  const app = createApp({ container, env, logger });
  const server = app.listen(env.PORT, () => {
    logger.info('API listening', { port: env.PORT, environment: env.NODE_ENV });
  });

  const shutdown = (signal: string): void => {
    logger.info('Shutting down', { signal });
    outreach.stop();
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
