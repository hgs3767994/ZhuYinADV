export const RESOURCE_TIMEOUT_MS = 10_000;

export class ResourceTimeoutError extends Error {
  constructor(message = 'Resource preparation timed out') {
    super(message);
    this.name = 'ResourceTimeoutError';
  }
}

export function isResourceTimeoutError(error: unknown): error is ResourceTimeoutError {
  return error instanceof ResourceTimeoutError ||
    (error instanceof Error && error.name === 'ResourceTimeoutError');
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

export async function trackLoadingTasks(
  tasks: Array<Promise<unknown>>,
  onProgress: (percent: number) => void,
  timeoutMs = RESOURCE_TIMEOUT_MS
): Promise<void> {
  if (tasks.length === 0) {
    onProgress(100);
    return;
  }

  let completed = 0;
  onProgress(0);
  const tracked = tasks.map((task) => task.then(() => {
    completed += 1;
    onProgress(Math.round((completed / tasks.length) * 100));
  }));

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = globalThis.setTimeout(
      () => reject(new ResourceTimeoutError()),
      timeoutMs
    );
  });

  try {
    await Promise.race([Promise.all(tracked), timeout]);
  } finally {
    if (timeoutId !== null) globalThis.clearTimeout(timeoutId);
  }
}

export async function runTaskPool<T>(
  items: readonly T[],
  worker: (item: T) => Promise<void>,
  onCompleted: (completed: number, total: number) => void,
  concurrency = 4,
  timeoutMs = 60_000
): Promise<void> {
  if (items.length === 0) {
    onCompleted(0, 0);
    return;
  }

  let nextIndex = 0;
  let completed = 0;
  let stopped = false;
  onCompleted(completed, items.length);
  const runners = Array.from(
    { length: Math.min(Math.max(1, concurrency), items.length) },
    async () => {
      while (!stopped && nextIndex < items.length) {
        const item = items[nextIndex];
        nextIndex += 1;
        await worker(item);
        if (stopped) return;
        completed += 1;
        onCompleted(completed, items.length);
      }
    }
  );
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = globalThis.setTimeout(
      () => {
        stopped = true;
        reject(new ResourceTimeoutError());
      },
      timeoutMs
    );
  });
  try {
    await Promise.race([Promise.all(runners), timeout]);
  } finally {
    stopped = true;
    if (timeoutId !== null) globalThis.clearTimeout(timeoutId);
  }
}
