import { OUTREACH_WORKER } from '../../config/constants';
import type { ILogger } from '../../common/types/logger';
import type { IOutreachDispatcher } from './outreach.interface';

export interface OutreachWorker {
  stop(): void;
}

/**
 * Drives the dispatcher on a timer, so a campaign created by a request is sent after it.
 *
 * A single in-process loop, which is right for one container and honest about its limit:
 * two instances would each poll, and the claim in `claimNextQueuedCampaign` is what stops
 * them sending the same campaign twice. `unref` keeps the timer from holding the process
 * open during shutdown, and the loop never overlaps itself.
 */
export const startOutreachWorker = (
  dispatcher: IOutreachDispatcher,
  logger: ILogger,
  intervalMs: number = OUTREACH_WORKER.INTERVAL_MS,
): OutreachWorker => {
  let isRunning = false;

  const tick = (): void => {
    if (isRunning) {
      return;
    }

    isRunning = true;
    void dispatcher
      .runOnce()
      .catch((error: unknown) => {
        logger.error('Outreach worker pass failed', {
          reason: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        isRunning = false;
      });
  };

  const timer = setInterval(tick, intervalMs);
  timer.unref();

  return {
    stop: (): void => {
      clearInterval(timer);
    },
  };
};
