import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import {
  LEVEL_TWO_MAZE_EXIT,
  LEVEL_TWO_MAZE_GEOMETRY,
  levelTwoMagicWallPoint,
  type SoundMazeNode,
  type SoundMazePoint,
  type SoundMazeRoute
} from '../game/soundMaze';
import { CAMPAIGN_IMAGES, soundMazeRoadTile } from '../game/campaignAssets';

interface SoundMazeMapViewportProps {
  nodes: readonly SoundMazeNode[];
  viewIndex: number;
  frontierIndex: number;
  cameraPoint: SoundMazePoint;
  exploredWrongRoutes: ReadonlySet<string>;
  revealedWallRouteId: string | null;
  focusedRouteSide: 'left' | 'right' | null;
  chosenCorrectRoutes: ReadonlyMap<number, 'left' | 'right'>;
  collectedFragmentNodes: ReadonlySet<number>;
  fragmentCount: number;
  fragmentAnimating: boolean;
  controlsDisabled: boolean;
  traveling: boolean;
  onChooseRoute: (route: SoundMazeRoute) => void;
  onLeaveMaze: () => void;
}

export interface SoundMazeMapViewportHandle {
  setCameraPoint: (point: SoundMazePoint) => void;
}

const screenAnchor = { x: 195, y: 315 };
const WORLD_TOP = -520;
const WORLD_BOTTOM = 2704;

const LANDMARK_ASSETS = {
  stone: { source: CAMPAIGN_IMAGES.soundMazeLandmarkStone, width: 108, height: 102 },
  fence: { source: CAMPAIGN_IMAGES.soundMazeLandmarkFence, width: 135, height: 105 },
  sign: { source: CAMPAIGN_IMAGES.soundMazeLandmarkSign, width: 123, height: 150 },
  rocks: { source: CAMPAIGN_IMAGES.soundMazeLandmarkRocks, width: 150, height: 120 },
  arch: { source: CAMPAIGN_IMAGES.soundMazeLandmarkArch, width: 141, height: 162 }
} as const;

type RoadPiece =
  | 'waiting'
  | 'left-correct'
  | 'right-correct'
  | 'left-blocked'
  | 'right-blocked';

const ROAD_PIECES: readonly RoadPiece[] = [
  'waiting',
  'left-correct',
  'right-correct',
  'left-blocked',
  'right-blocked'
];
const ROAD_TILE_X = -100;
const ROAD_TILE_WIDTH = 840;
const roadPieceUrl = (nodeIndex: number, piece: RoadPiece) =>
  `${soundMazeRoadTile(`node-${nodeIndex + 1}-${piece}`, 'png')}?v=14f1`;

function roadTileBounds(nodeIndex: number) {
  const destinationNode = LEVEL_TWO_MAZE_GEOMETRY[nodeIndex + 1];
  const destination = destinationNode?.fork ?? LEVEL_TWO_MAZE_EXIT;
  const top = destinationNode ? destinationNode.walls.left.y - 120 : destination.y - 120;
  const bottom = nodeIndex === 0 ? 2440 : LEVEL_TWO_MAZE_GEOMETRY[nodeIndex].fork.y + 240;
  return { top, height: bottom - top };
}

function RoadTile({
  nodeIndex,
  piece,
  visible,
  outgoing
}: {
  nodeIndex: number;
  piece: RoadPiece;
  visible: boolean;
  outgoing: boolean;
}) {
  const bounds = roadTileBounds(nodeIndex);
  const className = [
    'sound-maze-road-tile',
    `piece-${piece}`,
    visible ? 'is-visible' : null,
    outgoing ? 'is-outgoing' : null
  ].filter(Boolean).join(' ');
  return (
    <img
      className={className}
      src={roadPieceUrl(nodeIndex, piece)}
      alt=""
      draggable={false}
      decoding="async"
      style={{ left: ROAD_TILE_X, top: bounds.top, width: ROAD_TILE_WIDTH, height: bounds.height }}
    />
  );
}

function Landmark({ nodeIndex, visible }: { nodeIndex: number; visible: boolean }) {
  const geometry = LEVEL_TWO_MAZE_GEOMETRY[nodeIndex];
  if (!geometry) return null;
  const asset = LANDMARK_ASSETS[geometry.landmark];
  const x = geometry.fork.x - asset.width / 2;
  const y = geometry.fork.y - 112 - asset.height / 2;
  return (
    <div className={`sound-maze-node ${visible ? 'is-visible' : ''}`}>
      <img
        className="sound-maze-landmark sound-maze-landmark-image"
        src={asset.source}
        alt=""
        draggable={false}
        decoding="async"
        style={{ left: x, top: y, width: asset.width, height: asset.height }}
      />
    </div>
  );
}

export const SoundMazeMapViewport = forwardRef<SoundMazeMapViewportHandle, SoundMazeMapViewportProps>(function SoundMazeMapViewport({
  nodes,
  viewIndex,
  frontierIndex,
  cameraPoint,
  exploredWrongRoutes,
  revealedWallRouteId,
  focusedRouteSide,
  chosenCorrectRoutes,
  collectedFragmentNodes,
  fragmentCount,
  fragmentAnimating,
  controlsDisabled,
  traveling,
  onChooseRoute,
  onLeaveMaze
}: SoundMazeMapViewportProps, ref) {
  const currentNode = viewIndex < nodes.length ? nodes[viewIndex] : null;
  const atUnsolvedFork = currentNode !== null && viewIndex === frontierIndex;
  const revealedRoute = currentNode?.routes.find((route) => route.id === revealedWallRouteId) ?? null;
  const focusedRoute = currentNode?.routes.find((route) => route.side === focusedRouteSide) ?? null;
  const focusedCorrectSide = focusedRoute?.correct && focusedRoute.side !== 'center' ? focusedRoute.side : null;
  const focusedWrongSide = focusedRoute && !focusedRoute.correct && focusedRoute.side !== 'center' ? focusedRoute.side : null;
  const cameraGroupRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const coordinateStageRef = useRef<HTMLDivElement>(null);
  const fragmentRef = useRef<HTMLImageElement>(null);
  const preloadedRoadImagesRef = useRef<HTMLImageElement[]>([]);
  const fragmentPoint = focusedCorrectSide === null
    ? null
    : LEVEL_TWO_MAZE_GEOMETRY[frontierIndex]?.fragment ?? null;

  const setVisualCameraPoint = useCallback((point: SoundMazePoint) => {
    if (cameraGroupRef.current) {
      cameraGroupRef.current.style.transform = `translate3d(${screenAnchor.x - point.x}px, ${screenAnchor.y - point.y}px, 0)`;
    }
    if (fragmentRef.current && fragmentPoint) {
      fragmentRef.current.classList.toggle('is-near', Math.hypot(point.x - fragmentPoint.x, point.y - fragmentPoint.y) < 250);
    }
  }, [fragmentPoint]);

  useImperativeHandle(ref, () => ({ setCameraPoint: setVisualCameraPoint }), [setVisualCameraPoint]);
  useLayoutEffect(() => { setVisualCameraPoint(cameraPoint); }, [cameraPoint, setVisualCameraPoint]);

  useLayoutEffect(() => {
    const world = worldRef.current;
    const coordinateStage = coordinateStageRef.current;
    if (!world || !coordinateStage) return undefined;
    const updateScale = () => {
      const scale = Math.min(world.clientWidth / 390, world.clientHeight / 520);
      coordinateStage.style.transform = `translate(-50%, -50%) scale(${scale})`;
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(world);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const urls = LEVEL_TWO_MAZE_GEOMETRY.flatMap((_, index) =>
      ROAD_PIECES.map((piece) => roadPieceUrl(index, piece))
    );
    const images = urls.map((url) => {
      const image = new Image();
      image.decoding = 'async';
      image.src = url;
      void image.decode().catch(() => undefined);
      return image;
    });
    preloadedRoadImagesRef.current = images;
    return () => { preloadedRoadImagesRef.current = []; };
  }, []);

  const transform = `translate3d(${screenAnchor.x - cameraPoint.x}px, ${screenAnchor.y - cameraPoint.y}px, 0)`;
  const firstRenderedNodeIndex = Math.min(frontierIndex, LEVEL_TWO_MAZE_GEOMETRY.length - 1);
  const lastRenderedNodeIndex = Math.min(LEVEL_TWO_MAZE_GEOMETRY.length - 1, frontierIndex + 1);

  const pieceIsVisible = (index: number, piece: RoadPiece): boolean => {
    const isPast = index < frontierIndex;
    const isCurrent = index === frontierIndex;
    const isNext = index === frontierIndex + 1;
    const chosenSide = chosenCorrectRoutes.get(index);
    if (isPast) {
      if (chosenSide === undefined) return false;
      return piece === `${chosenSide}-correct`;
    }
    if (isCurrent) {
      if (focusedRouteSide === null) return piece === 'waiting';
      if (focusedCorrectSide !== null) return piece === `${focusedCorrectSide}-correct`;
      if (focusedWrongSide !== null) return piece === `${focusedWrongSide}-blocked`;
    }
    if (isNext && focusedCorrectSide !== null) {
      return piece === 'waiting';
    }
    return false;
  };

  const pieceIsOutgoing = (index: number, piece: RoadPiece): boolean =>
    index === frontierIndex && focusedRouteSide !== null && piece === 'waiting';

  return (
    <div className={`sound-maze-viewport sound-maze-map-viewport ${atUnsolvedFork ? 'at-unsolved-fork' : ''}`} aria-label="局部可見的迷霧道路">
      <div ref={worldRef} className="sound-maze-world" aria-hidden="true">
        <div ref={coordinateStageRef} className="sound-maze-coordinate-stage">
        <div ref={cameraGroupRef} className="sound-maze-camera" style={{ transform }}>
          <div
            className="sound-maze-forest-stage"
            style={{
              left: -200,
              top: WORLD_TOP,
              width: 1040,
              height: WORLD_BOTTOM - WORLD_TOP,
              backgroundImage: `url(${CAMPAIGN_IMAGES.soundMazeForestGround})`
            }}
          />
          <div className="sound-maze-baked-road-network">
            {LEVEL_TWO_MAZE_GEOMETRY.slice(firstRenderedNodeIndex, lastRenderedNodeIndex + 1).flatMap((_, offset) => {
              const index = firstRenderedNodeIndex + offset;
              return ROAD_PIECES.map((piece) => (
                <RoadTile
                  key={`road-${index}-${piece}`}
                  nodeIndex={index}
                  piece={piece}
                  visible={pieceIsVisible(index, piece)}
                  outgoing={pieceIsOutgoing(index, piece)}
                />
              ));
            })}
          </div>
          {LEVEL_TWO_MAZE_GEOMETRY.slice(firstRenderedNodeIndex, lastRenderedNodeIndex + 1).map((_, offset) => {
            const index = firstRenderedNodeIndex + offset;
            const isPastOrCurrent = index <= frontierIndex;
            const isApproachingNext = index === frontierIndex + 1 && focusedCorrectSide !== null;
            return <Landmark key={`maze-landmark-${index}`} nodeIndex={index} visible={isPastOrCurrent || isApproachingNext} />;
          })}
          {LEVEL_TWO_MAZE_GEOMETRY.map((geometry, index) => geometry.fragment
            && index === frontierIndex
            && focusedCorrectSide !== null
            && !collectedFragmentNodes.has(index) && (
            <img
              ref={fragmentRef}
              key={`fragment-${index}`}
              className={`sound-maze-map-fragment ${Math.hypot(cameraPoint.x - geometry.fragment.x, cameraPoint.y - geometry.fragment.y) < 250 ? 'is-near' : ''}`}
              src={CAMPAIGN_IMAGES.soundFragmentLarge}
              alt=""
              draggable={false}
              style={{ left: geometry.fragment.x - 24, top: geometry.fragment.y - 24, width: 48, height: 48 }}
            />
          ))}
          {fragmentCount === 3 && (
            <div className="sound-maze-map-exit">
              <img
                className="sound-maze-map-exit-image"
                src={CAMPAIGN_IMAGES.soundMazeExitPortal}
                alt=""
                draggable={false}
                style={{ left: LEVEL_TWO_MAZE_EXIT.x - 62.4, top: LEVEL_TWO_MAZE_EXIT.y - 83.2, width: 124.8, height: 166.4 }}
              />
            </div>
          )}
          {revealedRoute && revealedRoute.side !== 'center' && (() => {
            const wall = levelTwoMagicWallPoint(viewIndex, revealedRoute.side);
            return wall ? (
              <div
                className="sound-maze-magic-wall"
                style={{ left: wall.x - 96, top: wall.y - 90, width: 192, height: 180 }}
              >
                <img
                  className="sound-maze-magic-wall-image"
                  src={CAMPAIGN_IMAGES.soundMazeMagicMistWall}
                  alt=""
                  draggable={false}
                  style={{ left: 0, top: 0, width: 192, height: 180 }}
                />
              </div>
            ) : null;
          })()}
        </div>
        </div>
      </div>

      <div className="sound-maze-edge-fog" aria-hidden="true" />
      <div className="sound-maze-merge-fog" aria-hidden="true" />

      {fragmentAnimating && (
        <div className="sound-maze-fragment-collection" aria-hidden="true">
          <span className="sound-maze-fragment-light light-one" />
          <img className="sound-maze-fragment-reveal" src={CAMPAIGN_IMAGES.soundFragmentLarge} alt="" />
        </div>
      )}

      {atUnsolvedFork && !revealedRoute && !traveling && (
        <div className="sound-maze-route-options">
          {currentNode.routes.map((route) => (
            <button
              type="button"
              key={route.id}
              className={`sound-maze-map-route route-${route.side} ${exploredWrongRoutes.has(route.id) ? 'explored-dead-end' : ''}`}
              disabled={controlsDisabled}
              onClick={() => onChooseRoute(route)}
              aria-label={exploredWrongRoutes.has(route.id) ? `${route.symbol}，已探索的迷霧死路` : `選擇 ${route.symbol} 道路`}
            >
              {route.symbol}
            </button>
          ))}
        </div>
      )}

      {!currentNode && (
        <button
          type="button"
          className="sound-maze-map-exit-hitbox"
          disabled={controlsDisabled || fragmentCount !== 3}
          onClick={onLeaveMaze}
          aria-label="沿著光芒離開迷霧"
        />
      )}
    </div>
  );
});
