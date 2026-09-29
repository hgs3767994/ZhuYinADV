import { ResourceTimeoutError } from './loading';

const SERVICE_WORKER_READY_TIMEOUT_MS = 12_000;

export class OfflineShellUnavailableError extends Error {
  constructor(message = 'Offline app shell is not controlled') {
    super(message);
    this.name = 'OfflineShellUnavailableError';
  }
}

function withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId = 0;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(
      () => reject(new ResourceTimeoutError('Service worker control timed out')),
      timeoutMs
    );
  });
  return Promise.race([task, timeout]).finally(() => window.clearTimeout(timeoutId));
}

function waitForController(): Promise<void> {
  if (navigator.serviceWorker.controller) return Promise.resolve();
  return new Promise((resolve) => {
    const handleChange = () => {
      if (!navigator.serviceWorker.controller) return;
      navigator.serviceWorker.removeEventListener('controllerchange', handleChange);
      resolve();
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleChange);
  });
}

export async function ensureOfflineShellControl(): Promise<boolean> {
  if (!import.meta.env.PROD) return true;
  if (!('serviceWorker' in navigator)) throw new OfflineShellUnavailableError();
  await withTimeout(navigator.serviceWorker.ready, SERVICE_WORKER_READY_TIMEOUT_MS);
  await withTimeout(waitForController(), SERVICE_WORKER_READY_TIMEOUT_MS);
  if (!navigator.serviceWorker.controller) throw new OfflineShellUnavailableError();
  return true;
}

export async function requestPersistentOfflineStorage(): Promise<boolean | null> {
  if (!navigator.storage?.persist) return null;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}
