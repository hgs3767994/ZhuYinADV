import { describe, expect, it } from 'vitest';
import { ResourceTimeoutError, runTaskPool, trackLoadingTasks } from './loading';

describe('trackLoadingTasks', () => {
  it('reports progress as required resources finish', async () => {
    const progress: number[] = [];

    await trackLoadingTasks(
      [Promise.resolve(), Promise.resolve(), Promise.resolve(), Promise.resolve()],
      (value) => progress.push(value)
    );

    expect(progress).toEqual([0, 25, 50, 75, 100]);
  });

  it('rejects instead of leaving the loading screen stuck forever', async () => {
    await expect(trackLoadingTasks(
      [new Promise(() => undefined)],
      () => undefined,
      5
    )).rejects.toBeInstanceOf(ResourceTimeoutError);
  });
});

describe('runTaskPool', () => {
  it('limits concurrency while reporting item progress', async () => {
    let active = 0;
    let maximumActive = 0;
    const progress: number[] = [];

    await runTaskPool([1, 2, 3, 4, 5], async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await Promise.resolve();
      active -= 1;
    }, (completed) => progress.push(completed), 2);

    expect(maximumActive).toBe(2);
    expect(progress).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('times out a stalled pool', async () => {
    await expect(runTaskPool(
      [1],
      () => new Promise(() => undefined),
      () => undefined,
      1,
      5
    )).rejects.toBeInstanceOf(ResourceTimeoutError);
  });
});
