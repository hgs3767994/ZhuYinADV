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

  it('keeps production previews behind an explicit build flag', () => {
    const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');

    expect(main).toContain("import.meta.env.VITE_ENABLE_PREVIEWS === 'true'");
    expect(main).toContain('const preview = previewEnabled');
  });

  it('keeps camera frames outside React state and removes the portal oval focus ring', () => {
    const game = readFileSync(new URL('../src/components/SoundMazeGame.tsx', import.meta.url), 'utf8');
    const viewport = readFileSync(new URL('../src/components/SoundMazeMapViewport.tsx', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

    expect(game).toContain('mapViewportRef.current?.setCameraPoint({');
    expect(game).not.toContain('\n      setCameraPoint({');
    expect(viewport).toContain("fragmentRef.current.classList.toggle(");
    expect(styles).toMatch(/\.sound-maze-map-exit-hitbox:focus-visible[\s\S]*?outline:\s*0;[\s\S]*?box-shadow:\s*none;/);
  });

  it('uses pre-baked road tiles while moving the camera outside React state', () => {
    const game = readFileSync(new URL('../src/components/SoundMazeGame.tsx', import.meta.url), 'utf8');
    const viewport = readFileSync(new URL('../src/components/SoundMazeMapViewport.tsx', import.meta.url), 'utf8');
    const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
    const baker = readFileSync(new URL('../tools/sound-maze-road-baker/bake.mjs', import.meta.url), 'utf8');

    expect(viewport).toContain('sound-maze-baked-road-network');
    expect(viewport).toContain('soundMazeRoadTile');
    expect(viewport).toContain('function RoadTile');
    expect(viewport).not.toContain('sound-maze-road-mask-shapes');
    expect(viewport).not.toContain('sound-maze-road-mask-smooth-union');
    expect(viewport).not.toContain('sound-maze-unified-road-surface');
    expect(viewport).toContain('<Landmark key={`maze-landmark-${index}`} nodeIndex={index}');
    expect(viewport).toContain('index === frontierIndex + 1');
    expect(viewport).toContain('void image.decode().catch(() => undefined);');
    expect(viewport).toContain("piece === 'waiting'");
    expect(viewport).toContain('piece === `${focusedCorrectSide}-correct`');
    expect(viewport).toContain('piece === `${focusedWrongSide}-blocked`');
    expect(viewport).toContain("restoringWrongRoute && piece === 'waiting'");
    expect(viewport).toContain("index === frontierIndex && piece === 'waiting'");
    expect(viewport).not.toContain("index === frontierIndex && focusedRouteSide !== null && piece === 'waiting'");
    expect(game).toContain('setRestoringWrongRoute(true);');
    expect(game.indexOf('setRestoringWrongRoute(true);')).toBeLessThan(game.lastIndexOf('setFocusedRouteSide(null);'));
    expect(viewport).not.toContain('sound-maze-road-junction');
    expect(viewport).not.toContain('previewNodeIndex');
    expect(game.lastIndexOf('setChosenCorrectRoutes')).toBeGreaterThan(game.indexOf('await moveCameraAlong(afterFragment, 165)'));
    expect(styles).toMatch(/\.sound-maze-road-tile\s*\{[^}]*opacity:\s*0;[^}]*transition:\s*opacity 260ms ease;/);
    expect(styles).toMatch(/\.sound-maze-road-tile\.is-visible\s*\{[^}]*opacity:\s*1;/);
    expect(styles).toMatch(/\.sound-maze-road-tile\.is-visible\s*\{[^}]*transition-duration:\s*0ms;/);
    expect(styles).toMatch(/\.sound-maze-road-tile\.is-visible\.is-restoring\s*\{[^}]*transition-duration:\s*260ms;/);
    expect(styles).toMatch(/\.sound-maze-road-tile\.is-outgoing\s*\{[^}]*z-index:\s*12;/);
    expect(styles).toMatch(/\.sound-maze-node\s*\{[^}]*visibility:\s*hidden;/);
    expect(styles).not.toMatch(/\.sound-maze-node\s*\{[^}]*transition:/);
    expect(viewport).not.toContain('const MAZE_ROAD_MASK_STROKE_WIDTH');
    expect(viewport).not.toContain('filterUnits="userSpaceOnUse"');
    expect(game).toContain('await waitWhileActive(routeFadeDuration());');
    expect(game).not.toContain('setRouteContinuationVisible');
    expect(game).not.toContain('waitForRoadPaint');
    expect(game).not.toContain('mapViewportRef.current?.beginCameraMovement();');
    expect(game).not.toContain('mapViewportRef.current?.endCameraMovement();');
    expect(styles).toMatch(/\.sound-maze-merge-fog\s*\{[^}]*height:\s*42%;/);
    expect(styles).toMatch(/\.sound-maze-camera\s*\{[^}]*will-change:\s*transform;/);
    expect(viewport).toContain('ref={cameraGroupRef} className="sound-maze-camera"');
    expect(viewport).not.toContain('roadViewBox');
    expect(viewport).not.toContain('sound-maze-road-camera');
    expect(viewport).not.toContain('sound-maze-road-paint-bounds-${path.key}');
    expect(viewport).not.toContain('<feMergeNode in="SourceGraphic" />');
    expect(viewport).not.toContain("window.matchMedia('(hover: none) and (pointer: coarse)').matches");
    expect(viewport).not.toContain('scale(1.012)');
    expect(viewport).toContain('translate3d(${screenAnchor.x - point.x}px, ${screenAnchor.y - point.y}px, 0)');
    expect(styles).not.toContain('transform-box: view-box');
    expect(viewport).toContain('const firstRenderedNodeIndex = Math.min(frontierIndex, LEVEL_TWO_MAZE_GEOMETRY.length - 1);');
    expect(viewport).toContain('const lastRenderedNodeIndex = Math.min(LEVEL_TWO_MAZE_GEOMETRY.length - 1, frontierIndex + 1);');
    expect(viewport).toContain('backgroundImage: `url(${CAMPAIGN_IMAGES.soundMazeForestGround})`');
    expect(viewport).not.toContain('soundMazeForestStage(frontierIndex)');
    expect(viewport).toContain('width: 1040');
    expect(viewport).toContain('new ResizeObserver(updateScale)');
    expect(styles).toContain('.sound-maze-coordinate-stage');
    expect(styles).not.toMatch(/\.sound-maze-road-tile,[^}]*will-change:\s*opacity;/);
    expect(styles).not.toMatch(/\.sound-maze-node\s*\{[^}]*will-change:\s*opacity;/);
    expect(baker).toContain("waiting: [{ d: incoming, capEnd: false }, frontPath(index, 'left'), frontPath(index, 'right')]");
    expect(baker).not.toContain('bakeBranchCover');
    expect(baker).toContain("'level-02-forest-ground.webp', 768");
    expect(baker).toContain('flattenVisiblePixelsOntoForest');
    expect(baker).toContain('flattened[rgbaOffset + 3] = 255');
    expect(baker).toContain('.png({ compressionLevel: 9, adaptiveFiltering: true })');
  });
});
