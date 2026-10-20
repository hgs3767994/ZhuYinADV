import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('sound maze closeout safeguards', () => {
  it('keeps visual effects paused with gameplay', () => {
    const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

    expect(styles).toContain('.sound-maze-game.is-paused .sound-maze-fragment-light');
    expect(styles).toContain('.sound-maze-game.is-paused .sound-maze-magic-wall-image');
    expect(styles).toContain('.sound-maze-game.is-paused .sound-maze-map-exit-image');
    expect(styles).toMatch(/\.sound-maze-game\.is-paused[\s\S]*?animation-play-state:\s*paused;/);
  });

  it('keeps the app and service worker image cache names aligned', () => {
    const assetUtils = readFileSync(new URL('../src/utils/assets.ts', import.meta.url), 'utf8');
    const viteConfig = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');

    expect(assetUtils).toContain("OFFLINE_IMAGE_CACHE_NAME = 'zhuyin-images-v17'");
    expect(viteConfig).toContain("cacheName: 'zhuyin-images-v17'");
  });
});
