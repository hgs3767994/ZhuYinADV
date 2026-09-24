export function assetUrl(path: string): string {
  const normalizedPath = path.replace(/^\/+/, '');
  return `${import.meta.env.BASE_URL}${normalizedPath}`;
}

const imagePreloads = new Map<string, Promise<void>>();
const IMAGE_DECODE_GRACE_MS = 1_000;

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
