import { forwardRef, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { preload } from 'react-dom';
import type { SoundMazePoint, SoundMazeRoute } from '../game/soundMaze';
import { CAMPAIGN_IMAGES } from '../game/campaignAssets';
import type { SoundMazeMapViewportHandle } from './SoundMazeMapViewport';

const scale = 0.29;
const tileStep = 2000;
const lowerJunction = 1635;
const upperJunction = 475;
const exitY = 140;
const branchX = { left: 160, center: 540, right: 915 };
const corridorEdges = {
  left: { start: 25, end: 295 },
  center: { start: 419, end: 659 },
  right: { start: 780, end: 1050 }
};
type Side = SoundMazeRoute['side'];

export const CONNECTED_DUNGEON_SPEED = 175;

const point = (index: number, x: number, y: number): SoundMazePoint =>
  ({ x: x * scale, y: (y - index * tileStep) * scale });

export const connectedDungeonFork = (index: number) => point(index, 540, lowerJunction);

export function connectedDungeonPath(index: number, side: Side, correct: boolean, nodeCount: number) {
  const x = branchX[side];
  const start = connectedDungeonFork(index);
  const turn = side === 'center' ? [] : [point(index, x, lowerJunction)];
  const approach = [start, ...turn, point(index, x, correct ? upperJunction : 1120)];
  if (!correct) return { approach, onward: [] };
  if (side !== 'center') approach.push(point(index, 540, upperJunction));
  const merge = approach[approach.length - 1];
  return {
    approach,
    onward: [merge, index === nodeCount - 1
      ? point(index, 540, exitY)
      : connectedDungeonFork(index + 1)]
  };
}

interface Props {
  camera: SoundMazePoint;
  index: number;
  nodeCount: number;
  selected: SoundMazeRoute | null;
  returning: boolean;
  deadEnd: boolean;
  paused: boolean;
  fragmentVisible: boolean;
  exitVisible: boolean;
  completed: ReadonlyMap<number, Side>;
}

export const ConnectedDungeonRoad = forwardRef<SoundMazeMapViewportHandle, Props>(function ConnectedDungeonRoad(
  { camera, index, nodeCount, selected, returning, deadEnd, paused, fragmentVisible, exitVisible, completed }, ref
) {
  const rubbleSrc = CAMPAIGN_IMAGES.dungeonCollapsedStone;
  preload(rubbleSrc, { as: 'image' });
  const id = useId();
  const world = useRef<SVGGElement>(null);
  const rubble = useRef<SVGGElement>(null);
  const pausedRef = useRef(paused);
  useLayoutEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => {
    const stone = rubble.current;
    if (!deadEnd || !stone) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reducedMotion ? 240 : 480;
    const amplitude = reducedMotion ? 8 : 23;
    let elapsed = 0;
    let previousTime = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      if (!pausedRef.current) elapsed += Math.min(48, now - previousTime);
      previousTime = now;
      const progress = Math.min(1, elapsed / duration);
      const offset = Math.sin(progress * Math.PI * (reducedMotion ? 2 : 4)) * amplitude * (1 - progress);
      stone.setAttribute('transform', `translate(${offset} 0)`);
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(frame);
      stone.removeAttribute('transform');
    };
  }, [deadEnd]);
  const transform = (position: SoundMazePoint) => `translate(${195 - position.x} ${315 - position.y}) scale(${scale})`;
  useImperativeHandle(ref, () => ({
    setCameraPoint: (position) => world.current?.setAttribute('transform', transform(position))
  }), []);
  useLayoutEffect(() => { world.current?.setAttribute('transform', transform(camera)); }, [camera]);
  // Keep just the current junction and the tiles that can enter the viewport.
  const visibleTiles = [index + 1, index, index - 1].filter((tile) =>
    tile >= 0 && tile < nodeCount && (tile <= index || selected?.correct));

  return (
    <svg className="connected-dungeon-road" viewBox="0 0 390 520" aria-hidden="true">
      <defs>
        <clipPath id={`${id}-lower`}><rect x="0" y="1100" width="1080" height="1000" /></clipPath>
        <radialGradient id={`${id}-rubble`}>
          <stop offset="66%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </radialGradient>
        <mask id={`${id}-rubble-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="580" height="385">
          <rect width="580" height="385" fill={`url(#${id}-rubble)`} />
        </mask>
      </defs>
      <g ref={world} transform={transform(camera)}>
        {visibleTiles.map((tile) => {
          const route = tile === index ? selected : null;
          const side = completed.get(tile) ?? route?.side;
          const blocked = route?.correct === false;
          const x = side ? branchX[side] : 540;
          const center = corridorEdges.center;
          const branch = corridorEdges[side ?? 'center'];
          const left = Math.min(branch.start, center.start);
          const width = Math.max(branch.end, center.end) - left;
          const clip = `${id}-tile-${tile}`;
          const fullArt = (
            <>
              <image href={CAMPAIGN_IMAGES.dungeonForkRoad} width="1080" height="2113" />
              <image href={CAMPAIGN_IMAGES.dungeonForkEntrance} x="-26" y="934" width="1132" height="1157"
                clipPath={`url(#${id}-lower)`} />
            </>
          );
          return (
            <g key={tile} transform={`translate(0 ${-tile * tileStep})`}>
              <defs><clipPath id={clip}>
                <rect x={center.start} y="1748" width={center.end - center.start} height="365" />
                <rect x={left} y="1515" width={width} height="240" />
                <rect x={branch.start} y={blocked ? 935 : 350} width={branch.end - branch.start} height={blocked ? 810 : 1400} />
                {!blocked && <rect x={left} y="350" width={width} height="245" />}
                {!blocked && <rect x={center.start} y="0" width={center.end - center.start} height="375" />}
              </clipPath></defs>
              {side && <g clipPath={`url(#${clip})`}>{fullArt}</g>}
              {tile >= index && <g className={`connected-dungeon-unselected${side && !returning ? ' is-hidden' : ''}`}>
                {fullArt}
              </g>}
              {tile === index && route?.correct && fragmentVisible && (
                <image href={CAMPAIGN_IMAGES.soundFragmentLarge}
                  x="457" y={upperJunction - 83} width="166" height="166" />
              )}
              {blocked && (
                <g ref={rubble}>
                  <svg x={x - 290} y="820" width="580" height="385" viewBox="0 0 580 385">
                    <image href={rubbleSrc} width="580" height="385" mask={`url(#${id}-rubble-mask)`} />
                  </svg>
                </g>
              )}
              {exitVisible && tile === nodeCount - 1 && (
                <g transform={`translate(540 ${exitY}) scale(${1 / scale})`}>
                  <g className="sound-maze-map-exit">
                    <image className="sound-maze-map-exit-image" href={CAMPAIGN_IMAGES.soundMazeExitPortal}
                      x="-62.4" y="-83.2" width="124.8" height="166.4" />
                  </g>
                </g>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
});
