import type { Request, Response } from 'express';

import { sendSuccess } from '../../common/http/api-response';
import type { IDatabaseConnection } from '../../database/connection';

/** Liveness plus a database ping — used by the Docker HEALTHCHECK. */
export class HealthController {
  constructor(
    private readonly database: IDatabaseConnection,
    private readonly now: () => Date = () => new Date(),
  ) {}

  check = async (_req: Request, res: Response): Promise<void> => {
    const isDatabaseHealthy = await this.database.isHealthy();

    sendSuccess(
      res,
      {
        status: isDatabaseHealthy ? 'ok' : 'degraded',
        database: isDatabaseHealthy ? 'up' : 'down',
        timestamp: this.now().toISOString(),
      },
      isDatabaseHealthy ? 200 : 503,
    );
  };
}
