export function assetUrl(path: string): string {
  const normalizedPath = path.replace(/^\/+/, '');
  return `${import.meta.env.BASE_URL}${normalizedPath}`;
}

const imagePreloads = new Map<string, Promise<void>>();

export function preloadImage(source: string): Promise<void> {
  const existing = imagePreloads.get(source);
  if (existing) return existing;

  const pending = new Promise<void>((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = source;
  });
  imagePreloads.set(source, pending);
  return pending;
}
