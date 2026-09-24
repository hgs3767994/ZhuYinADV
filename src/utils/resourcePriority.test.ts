import { describe, expect, it } from 'vitest';
import { runCriticalResource, waitForCriticalResources } from './resourcePriority';

describe('resource priority coordinator', () => {
  it('holds background work until critical work has finished', async () => {
    let finishCritical: (() => void) | undefined;
    const critical = runCriticalResource(() => new Promise<void>((resolve) => {
      finishCritical = resolve;
    }));
    let backgroundStarted = false;
    const background = waitForCriticalResources().then(() => {
      backgroundStarted = true;
    });

    await Promise.resolve();
    expect(backgroundStarted).toBe(false);
    finishCritical?.();
    await critical;
    await background;
    expect(backgroundStarted).toBe(true);
  });
});
