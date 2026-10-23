import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/audio', () => ({
  audioService: {
    speakSequence: vi.fn().mockResolvedValue(undefined),
    stopSpeech: vi.fn(),
    playWrong: vi.fn(),
    playCorrect: vi.fn()
  }
}));

import { SoundMazeGame } from './SoundMazeGame';
import { SoundMazeMapViewport } from './SoundMazeMapViewport';
import { createLevelTwoSoundMaze, LEVEL_TWO_MAZE_EXIT, LEVEL_TWO_MAZE_GEOMETRY } from '../game/soundMaze';

describe('sound maze gameplay shell', () => {
  it('renders a local two-way fork without a full-map, timer or rune gate', () => {
    const html = renderToStaticMarkup(
      <SoundMazeGame
        variant="fork"
        resultId="maze-preview"
        paused
        inputEnabled={false}
        onFragmentCountChange={() => undefined}
        onInteractionLockChange={() => undefined}
        onSolved={() => undefined}
      />
    );

    expect(html).toContain('sound-maze-map-viewport');
    expect(html).toContain('sound-maze-game feedback-none is-paused');
    expect(html).toContain('sound-maze-world');
    expect(html).toContain('level-02-forest-ground.webp');
    expect(html).not.toContain('sound-maze-corridor-bank-edge-mask');
    expect(html).toContain('road-tiles/node-1-waiting.png?v=14f2');
    expect(html).toContain('piece-waiting is-visible is-outgoing');
    expect(html).toContain('level-02-landmark-01-stele.png');
    expect((html.match(/sound-maze-map-route route-/g) ?? [])).toHaveLength(2);
    expect(html).toContain('重播目標讀音');
    expect(html).not.toContain('返回上一個岔路');
    expect(html).not.toContain('sound-maze-navigation');
    expect((html.match(/class="sound-maze-road-tile/g) ?? [])).toHaveLength(10);
    expect((html.match(/sound-maze-road-tile[^\"]*is-visible/g) ?? [])).toHaveLength(1);
    expect((html.match(/class="sound-maze-node/g) ?? [])).toHaveLength(2);
    expect(html).not.toContain('sound-maze-road-mask-');
    expect(html).not.toContain('sound-fragment-large.png');
    expect(html).not.toContain('sound-maze-player');
    expect(html).not.toContain('wall-revealed');
    expect(html).not.toContain('wrong-marker');
    expect(html).not.toContain('留下迷霧記號');
    expect(html).not.toContain('完整地圖');
    expect(html).not.toContain('符文門');
    expect(html).not.toContain('倒數');
  });

  it('renders three rune gates without fork wording, a timer or a full map', () => {
    const html = renderToStaticMarkup(
      <SoundMazeGame
        variant="rune-gate"
        resultId="rune-gate-preview"
        paused
        inputEnabled={false}
        onFragmentCountChange={() => undefined}
        onInteractionLockChange={() => undefined}
        onSolved={() => undefined}
      />
    );

    expect((html.match(/sound-maze-rune-gate /g) ?? [])).toHaveLength(3);
    expect((html.match(/選擇 [^\s]+ 符文門/g) ?? [])).toHaveLength(3);
    expect(html).not.toContain('返回上一道符文門');
    expect(html).not.toContain('返回上一個岔路');
    expect(html).not.toContain('倒數');
    expect(html).not.toContain('完整地圖');
  });

  it('uses independent dead ends, positively fades the unselected branch and reveals fragments only on approach', () => {
    const nodes = createLevelTwoSoundMaze('layer-state-preview');
    const wrongRoute = nodes[0].routes.find((route) => !route.correct)!;
    const correctRoute = nodes[0].routes.find((route) => route.correct)!;
    const commonProps = {
      nodes,
      viewIndex: 0,
      frontierIndex: 0,
      cameraPoint: LEVEL_TWO_MAZE_GEOMETRY[0].fork,
      exploredWrongRoutes: new Set<string>(),
      chosenCorrectRoutes: new Map<number, 'left' | 'right'>(),
      collectedFragmentNodes: new Set<number>(),
      fragmentCount: 0,
      fragmentAnimating: false,
      controlsDisabled: false,
      traveling: true,
      onChooseRoute: () => undefined,
      onLeaveMaze: () => undefined
    } as const;

    const wrongHtml = renderToStaticMarkup(
      <SoundMazeMapViewport
        {...commonProps}
        revealedWallRouteId={wrongRoute.id}
        focusedRouteSide={wrongRoute.side as 'left' | 'right'}
      />
    );
    expect((wrongHtml.match(/class="sound-maze-road-tile/g) ?? [])).toHaveLength(10);
    expect((wrongHtml.match(/is-visible" src=/g) ?? [])).toHaveLength(1);
    expect(wrongHtml).toContain(`road-tiles/node-1-${wrongRoute.side}-blocked.png`);
    expect(wrongHtml).toContain(`piece-${wrongRoute.side}-blocked is-visible`);
    expect((wrongHtml.match(/level-02-magic-mist-wall-wide-stretched-192x180\.png/g) ?? [])).toHaveLength(2);
    expect(wrongHtml).toContain('height:180px');
    expect(wrongHtml).not.toContain('sound-maze-road-mask-');
    expect(wrongHtml).not.toContain('filterUnits="userSpaceOnUse"');
    expect(wrongHtml).not.toContain('<circle');
    expect(wrongHtml).not.toContain('sound-maze-branch-eraser');
    expect(wrongHtml).toContain('sound-maze-baked-road-network');
    expect(wrongHtml).not.toContain('sound-maze-road-junction');
    expect(wrongHtml).not.toContain('sound-maze-map-fragment');
    expect(wrongHtml).toContain('width:108px');
    expect(wrongHtml).toContain('height:102px');
    expect(wrongHtml).toContain('left:266px;top:1937px');

    const restoringHtml = renderToStaticMarkup(
      <SoundMazeMapViewport
        {...commonProps}
        revealedWallRouteId={null}
        focusedRouteSide={wrongRoute.side as 'left' | 'right'}
        restoringWrongRoute
      />
    );
    expect((restoringHtml.match(/sound-maze-road-tile[^\"]*is-visible/g) ?? [])).toHaveLength(2);
    expect(restoringHtml).toContain('piece-waiting is-visible is-outgoing is-restoring');
    expect(restoringHtml).toContain(`piece-${wrongRoute.side}-blocked is-visible`);

    const correctHtml = renderToStaticMarkup(
      <SoundMazeMapViewport
        {...commonProps}
        revealedWallRouteId={null}
        focusedRouteSide={correctRoute.side as 'left' | 'right'}
      />
    );
    expect((correctHtml.match(/class="sound-maze-road-tile/g) ?? [])).toHaveLength(10);
    expect((correctHtml.match(/is-visible" src=/g) ?? [])).toHaveLength(2);
    expect(correctHtml).toContain(`road-tiles/node-1-${correctRoute.side}-correct.png`);
    expect(correctHtml).toContain('sound-maze-map-fragment ');
    expect(correctHtml).not.toContain('sound-maze-map-fragment is-near');

    const fadingHtml = renderToStaticMarkup(
      <SoundMazeMapViewport
        {...commonProps}
        revealedWallRouteId={null}
        focusedRouteSide={correctRoute.side as 'left' | 'right'}
      />
    );
    expect(fadingHtml).toContain(`piece-${correctRoute.side}-correct is-visible`);
    expect(fadingHtml).not.toContain('sound-maze-road-mask-');
    expect(fadingHtml).not.toContain('sound-maze-road-paint-bounds-route-0-right');
    const fourthForkHtml = renderToStaticMarkup(
      <SoundMazeMapViewport
        {...commonProps}
        viewIndex={3}
        frontierIndex={3}
        cameraPoint={LEVEL_TWO_MAZE_GEOMETRY[3].fork}
        revealedWallRouteId={null}
        focusedRouteSide={null}
      />
    );
    expect(fourthForkHtml).toContain('road-tiles/node-4-waiting.png?v=14f2');
    expect(fourthForkHtml).not.toContain('sound-maze-road-paint-bounds-route-3-left');

    const nearFragmentHtml = renderToStaticMarkup(
      <SoundMazeMapViewport
        {...commonProps}
        cameraPoint={LEVEL_TWO_MAZE_GEOMETRY[0].fragment!}
        revealedWallRouteId={null}
        focusedRouteSide={correctRoute.side as 'left' | 'right'}
      />
    );
    expect(nearFragmentHtml).toContain('sound-maze-map-fragment is-near');

    const preloadedHtml = renderToStaticMarkup(
      <SoundMazeMapViewport
        {...commonProps}
        revealedWallRouteId={null}
        focusedRouteSide={correctRoute.side as 'left' | 'right'}
      />
    );
    expect((preloadedHtml.match(/sound-maze-node is-visible/g) ?? [])).toHaveLength(2);
    expect(preloadedHtml).toContain('road-tiles/node-2-waiting.png?v=14f2');
    expect((preloadedHtml.match(/is-visible" src=/g) ?? [])).toHaveLength(2);
    expect(preloadedHtml).not.toContain('sound-maze-branch-fog');
    expect(preloadedHtml).not.toContain('sound-maze-route-focus-fog');
    expect(preloadedHtml).not.toContain('sound-maze-footprints');
    expect(preloadedHtml).toContain('class="sound-maze-forest-stage" style="left:-200px;top:-520px;width:1040px;height:3224px;background-image:url(/assets/images/campaign/sound-maze/level-02-forest-ground.webp)"');

    const beforeThirdFragmentHtml = renderToStaticMarkup(
      <SoundMazeMapViewport
        {...commonProps}
        viewIndex={nodes.length - 1}
        frontierIndex={nodes.length - 1}
        cameraPoint={LEVEL_TWO_MAZE_GEOMETRY.at(-1)!.fragment!}
        revealedWallRouteId={null}
        focusedRouteSide={null}
        fragmentCount={2}
        traveling={false}
      />
    );
    expect(beforeThirdFragmentHtml).not.toContain('level-02-exit-portal-soft-v01.png');
    expect(beforeThirdFragmentHtml).not.toContain('sound-maze-map-exit');

    const exitHtml = renderToStaticMarkup(
      <SoundMazeMapViewport
        {...commonProps}
        viewIndex={nodes.length}
        frontierIndex={nodes.length}
        cameraPoint={LEVEL_TWO_MAZE_EXIT}
        revealedWallRouteId={null}
        focusedRouteSide={null}
        fragmentCount={3}
        traveling={false}
        controlsDisabled={false}
      />
    );
    expect(exitHtml).toContain('level-02-exit-portal-soft-v01.png');
    expect(exitHtml).toContain('class="sound-maze-map-exit"');
    expect(exitHtml).toContain('sound-maze-map-exit-image');
    expect(exitHtml).toContain('class="sound-maze-map-exit-hitbox"');
    expect(exitHtml).toContain('aria-label="沿著光芒離開迷霧"');
    expect(exitHtml).toContain('width:124.8px');
    expect(exitHtml).toContain('height:166.4px');
    expect(exitHtml).not.toContain('sound-maze-map-exit-button');
    expect(exitHtml).not.toContain('<circle');

    const fragmentAnimationHtml = renderToStaticMarkup(
      <SoundMazeMapViewport
        {...commonProps}
        revealedWallRouteId={null}
        focusedRouteSide={correctRoute.side as 'left' | 'right'}
        fragmentAnimating
      />
    );
    expect((fragmentAnimationHtml.match(/sound-maze-fragment-light/g) ?? [])).toHaveLength(1);
    expect(fragmentAnimationHtml).not.toContain('light-two');
    expect(fragmentAnimationHtml).not.toContain('light-three');
  });
});
