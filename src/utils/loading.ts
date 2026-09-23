export const RESOURCE_TIMEOUT_MS = 10_000;

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
      () => reject(new Error('Resource preparation timed out')),
      timeoutMs
    );
  });

  try {
    await Promise.race([Promise.all(tracked), timeout]);
  } finally {
    if (timeoutId !== null) globalThis.clearTimeout(timeoutId);
  }
}
