import { describe, expect, it } from 'vitest';
import { ResourceTimeoutError, trackLoadingTasks } from './loading';

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
