export function assetUrl(path: string): string {
  const normalizedPath = path.replace(/^\/+/, '');
  return `${import.meta.env.BASE_URL}${normalizedPath}`;
}

const imagePreloads = new Map<string, Promise<void>>();

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
      void image.decode().then(resolve, resolve);
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
