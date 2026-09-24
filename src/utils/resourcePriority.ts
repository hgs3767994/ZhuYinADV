let criticalResourceCount = 0;
let criticalIdleResolvers: Array<() => void> = [];

export async function runCriticalResource<T>(task: () => Promise<T>): Promise<T> {
  criticalResourceCount += 1;
  try {
    return await task();
  } finally {
    criticalResourceCount -= 1;
    if (criticalResourceCount === 0) {
      const resolvers = criticalIdleResolvers;
      criticalIdleResolvers = [];
      resolvers.forEach((resolve) => resolve());
    }
  }
}

export function waitForCriticalResources(): Promise<void> {
  if (criticalResourceCount === 0) return Promise.resolve();
  return new Promise((resolve) => criticalIdleResolvers.push(resolve));
}
