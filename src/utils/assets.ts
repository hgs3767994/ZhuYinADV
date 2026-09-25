export function assetUrl(path: string): string {
  const normalizedPath = path.replace(/^\/+/, '');
  return `${import.meta.env.BASE_URL}${normalizedPath}`;
}

const imagePreloads = new Map<string, Promise<void>>();
const IMAGE_DECODE_GRACE_MS = 1_000;
export const OFFLINE_IMAGE_CACHE_NAME = 'zhuyin-images-v2';
const PREVIOUS_IMAGE_CACHE_NAME = 'zhuyin-images-v1';

export async function hasMissingOfflineImages(sources: string[]): Promise<boolean> {
  if (!('caches' in window)) return true;
  try {
    const cache = await caches.open(OFFLINE_IMAGE_CACHE_NAME);
    for (const source of sources) {
      if (!await cache.match(source)) return true;
    }
    return false;
  } catch {
    return true;
  }
}

export async function prepareOfflineImage(source: string): Promise<void> {
  if (!('caches' in window)) {
    await preloadImage(source);
    return;
  }

  const cache = await caches.open(OFFLINE_IMAGE_CACHE_NAME);
  if (!await cache.match(source)) {
    const existing = await caches.match(source);
    if (existing) {
      await cache.put(source, existing.clone());
    } else {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`Image request failed: ${source}`);
      await cache.put(source, response.clone());
    }
  }
  await preloadImage(source);
}

export async function cleanupPreviousImageCache(): Promise<void> {
  if (!('caches' in window)) return;
  await caches.delete(PREVIOUS_IMAGE_CACHE_NAME).catch(() => false);
}

export function resetImagePreloads(sources: string[]): void {
  sources.forEach((source) => imagePreloads.delete(source));
}

export function preloadImage(source: string): Promise<void> {
  const existing = imagePreloads.get(source);
  if (existing) return existing;

  const pending = new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      if (typeof image.decode !== 'function') {
        resolve();
        return;
      }
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(decodeFallback);
        resolve();
      };
      const decodeFallback = window.setTimeout(finish, IMAGE_DECODE_GRACE_MS);
      void image.decode().then(finish, finish);
    };
    image.onerror = () => reject(new Error(`Image request failed: ${source}`));
    image.src = source;
  }).catch((error) => {
    imagePreloads.delete(source);
    throw error;
  });
  imagePreloads.set(source, pending);
  return pending;
}
