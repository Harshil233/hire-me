import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createFakeLogger } from '../../../../tests/helpers/fakes';
import type { IOutreachDispatcher } from '../outreach.interface';
import { startOutreachWorker } from '../outreach.worker';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('startOutreachWorker', () => {
  it('does not send anything before the first tick', () => {
    const dispatcher: IOutreachDispatcher = { runOnce: vi.fn(async () => 0) };

    startOutreachWorker(dispatcher, createFakeLogger(), 1000);

    expect(dispatcher.runOnce).not.toHaveBeenCalled();
  });

  it('runs a pass on every interval', async () => {
    const dispatcher: IOutreachDispatcher = { runOnce: vi.fn(async () => 0) };

    startOutreachWorker(dispatcher, createFakeLogger(), 1000);
    await vi.advanceTimersByTimeAsync(3000);

    expect(dispatcher.runOnce).toHaveBeenCalledTimes(3);
  });

  it('never overlaps a pass that is still running', async () => {
    let release = (): void => undefined;
    const dispatcher: IOutreachDispatcher = {
      runOnce: vi.fn(
        async () =>
          new Promise<number>((resolve) => {
            release = (): void => {
              resolve(0);
            };
          }),
      ),
    };

    startOutreachWorker(dispatcher, createFakeLogger(), 1000);
    await vi.advanceTimersByTimeAsync(3000);

    expect(dispatcher.runOnce).toHaveBeenCalledTimes(1);

    release();
  });

  it('keeps going after a pass throws', async () => {
    const dispatcher: IOutreachDispatcher = {
      runOnce: vi
        .fn<IOutreachDispatcher['runOnce']>()
        .mockRejectedValueOnce(new Error('database gone'))
        .mockResolvedValue(0),
    };
    const logger = createFakeLogger();

    startOutreachWorker(dispatcher, logger, 1000);
    await vi.advanceTimersByTimeAsync(2000);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('worker pass failed'),
      expect.objectContaining({ reason: 'database gone' }),
    );
    expect(dispatcher.runOnce).toHaveBeenCalledTimes(2);
  });

  it('stops when asked, so shutdown is clean', async () => {
    const dispatcher: IOutreachDispatcher = { runOnce: vi.fn(async () => 0) };

    startOutreachWorker(dispatcher, createFakeLogger(), 1000).stop();
    await vi.advanceTimersByTimeAsync(5000);

    expect(dispatcher.runOnce).not.toHaveBeenCalled();
  });
});
