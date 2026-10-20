import {
  LEVEL_TWO_MAZE_EXIT,
  LEVEL_TWO_MAZE_GEOMETRY,
  levelTwoBlockedRoutePoints,
  levelTwoConnectorPathData,
  levelTwoForkRoutePathData,
  levelTwoMagicWallPoint,
  type SoundMazeNode,
  type SoundMazePoint,
  type SoundMazeRoute
} from '../game/soundMaze';
import { CAMPAIGN_IMAGES } from '../game/campaignAssets';

interface SoundMazeMapViewportProps {
  nodes: readonly SoundMazeNode[];
  viewIndex: number;
  frontierIndex: number;
  cameraPoint: SoundMazePoint;
  exploredWrongRoutes: ReadonlySet<string>;
  revealedWallRouteId: string | null;
  focusedRouteSide: 'left' | 'right' | null;
  previewNodeIndex: number | null;
  chosenCorrectRoutes: ReadonlyMap<number, 'left' | 'right'>;
  collectedFragmentNodes: ReadonlySet<number>;
  fragmentCount: number;
  fragmentAnimating: boolean;
  controlsDisabled: boolean;
  traveling: boolean;
  onChooseRoute: (route: SoundMazeRoute) => void;
  onLeaveMaze: () => void;
}

const screenAnchor = { x: 195, y: 315 };

const LANDMARK_ASSETS = {
  stone: { source: CAMPAIGN_IMAGES.soundMazeLandmarkStone, width: 108, height: 102 },
  fence: { source: CAMPAIGN_IMAGES.soundMazeLandmarkFence, width: 135, height: 105 },
  sign: { source: CAMPAIGN_IMAGES.soundMazeLandmarkSign, width: 123, height: 150 },
  rocks: { source: CAMPAIGN_IMAGES.soundMazeLandmarkRocks, width: 150, height: 120 },
  arch: { source: CAMPAIGN_IMAGES.soundMazeLandmarkArch, width: 141, height: 162 }
} as const;

const ROAD_LAYERS = ['clearing', 'shoulder', 'fill'] as const;
const MAZE_ROAD_MASK_STROKE_WIDTH = { clearing: 138, shoulder: 88, fill: 62 } as const;

interface MazeVisualPath {
  key: string;
  d: string;
  className: string;
}

function pointsToPathData(points: readonly SoundMazePoint[]): string {
  if (points.length === 0) return '';
  return `M ${points.map((point) => `${point.x} ${point.y}`).join(' L ')}`;
}

function FirstForkForestCorridor() {
  const bankRows = [1640, 1980, 2320];
  return (
    <g className="sound-maze-first-fork-corridor" aria-hidden="true">
      {bankRows.map((y) => (
        <g key={`forest-bank-row-${y}`}>
          <image
            className="sound-maze-corridor-bank"
            href={CAMPAIGN_IMAGES.soundMazeForestBankLeft}
            x="24"
            y={y}
            width="256"
            height="384"
            preserveAspectRatio="none"
            mask="url(#sound-maze-corridor-bank-edge-mask)"
          />
          <g transform="translate(640 0) scale(-1 1)">
            <image
              className="sound-maze-corridor-bank"
              href={CAMPAIGN_IMAGES.soundMazeForestBankLeft}
              x="24"
              y={y}
              width="256"
              height="384"
              preserveAspectRatio="none"
              mask="url(#sound-maze-corridor-bank-edge-mask)"
            />
          </g>
        </g>
      ))}
    </g>
  );
}

function Landmark({ nodeIndex }: { nodeIndex: number }) {
  const geometry = LEVEL_TWO_MAZE_GEOMETRY[nodeIndex];
  if (!geometry) return null;
  const x = geometry.fork.x;
  const y = geometry.fork.y - 112;
  const asset = LANDMARK_ASSETS[geometry.landmark];
  return (
    <g className="sound-maze-landmark" transform={`translate(${x} ${y})`}>
      <image
        className="sound-maze-landmark-image"
        href={asset.source}
        x={-asset.width / 2}
        y={-asset.height / 2}
        width={asset.width}
        height={asset.height}
        preserveAspectRatio="xMidYMid meet"
      />
    </g>
  );
}

export function SoundMazeMapViewport({
  nodes,
  viewIndex,
  frontierIndex,
  cameraPoint,
  exploredWrongRoutes,
  revealedWallRouteId,
  focusedRouteSide,
  previewNodeIndex,
  chosenCorrectRoutes,
  collectedFragmentNodes,
  fragmentCount,
  fragmentAnimating,
  controlsDisabled,
  traveling,
  onChooseRoute,
  onLeaveMaze
}: SoundMazeMapViewportProps) {
  const currentNode = viewIndex < nodes.length ? nodes[viewIndex] : null;
  const atUnsolvedFork = currentNode !== null && viewIndex === frontierIndex;
  const revealedRoute = currentNode?.routes.find((route) => route.id === revealedWallRouteId) ?? null;
  const focusedRoute = currentNode?.routes.find((route) => route.side === focusedRouteSide) ?? null;
  const focusedCorrectSide = focusedRoute?.correct && focusedRoute.side !== 'center' ? focusedRoute.side : null;
  const transform = `translate(${screenAnchor.x - cameraPoint.x}px, ${screenAnchor.y - cameraPoint.y}px)`;
  const mazeRoadPaths: MazeVisualPath[] = [
    {
      key: 'entry',
      d: 'M 320 2360 C 320 2270, 320 2180, 320 2094',
      className: 'sound-maze-first-fork-entry'
    }
  ];

  LEVEL_TWO_MAZE_GEOMETRY.forEach((geometry, index) => {
    const isPast = index < frontierIndex;
    const isCurrent = index === frontierIndex;
    const isPreview = index === previewNodeIndex;
    const chosenSide = chosenCorrectRoutes.get(index);
    const currentCorrectSide = nodes[index]?.routes.find((route) => route.correct)?.side;
    const showConnector = Boolean((isPast && chosenSide) || (isCurrent && focusedCorrectSide === currentCorrectSide));

    for (const side of ['left', 'right'] as const) {
      const renderFront = isCurrent || isPreview || (isPast && chosenSide === side);
      const renderBack = (isPast && chosenSide === side)
        || (isCurrent && focusedCorrectSide === side);
      if (renderFront) {
        const isRevealedWrongRoute = isCurrent && revealedRoute?.side === side && !revealedRoute.correct;
        const isHidden = isCurrent && focusedRouteSide !== null && focusedRouteSide !== side;
        const frontPath: MazeVisualPath = {
          key: `front-${index}-${side}`,
          d: isRevealedWrongRoute
            ? pointsToPathData(levelTwoBlockedRoutePoints(index, side))
            : levelTwoForkRoutePathData(index, side, 'front'),
          className: `sound-maze-route-front route-${side} ${isHidden ? 'is-hidden' : ''}`
        };
        mazeRoadPaths.push(frontPath);
      }
      if (renderBack) {
        mazeRoadPaths.push({
          key: `back-${index}-${side}`,
          d: levelTwoForkRoutePathData(index, side, 'back'),
          className: `sound-maze-route-back route-${side}`
        });
      }
    }

    if (showConnector) {
      mazeRoadPaths.push({
        key: `connector-${index}`,
        d: levelTwoConnectorPathData(index),
        className: 'sound-maze-route-connector'
      });
    }
  });

  return (
    <div className={`sound-maze-viewport sound-maze-map-viewport ${atUnsolvedFork ? 'at-unsolved-fork' : ''}`} aria-label="局部可見的迷霧道路">
      <svg className="sound-maze-world" viewBox="0 0 390 520" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs>
          <pattern id="sound-maze-forest-ground" patternUnits="userSpaceOnUse" width="768" height="768">
            <image href={CAMPAIGN_IMAGES.soundMazeForestGround} width="768" height="768" preserveAspectRatio="none" />
          </pattern>
          <pattern id="sound-maze-road-texture" patternUnits="userSpaceOnUse" width="512" height="512">
            <image href={CAMPAIGN_IMAGES.soundMazeRoadTexture} width="512" height="512" preserveAspectRatio="none" />
          </pattern>
          <pattern id="sound-maze-road-clearing-texture" patternUnits="userSpaceOnUse" width="512" height="512">
            <image href={CAMPAIGN_IMAGES.soundMazeRoadClearingTexture} width="512" height="512" preserveAspectRatio="none" />
          </pattern>
          <linearGradient id="sound-maze-corridor-bank-edge-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="black" />
            <stop offset="0.2" stopColor="white" />
            <stop offset="1" stopColor="white" />
          </linearGradient>
          <mask
            id="sound-maze-corridor-bank-edge-mask"
            x="0"
            y="0"
            width="1"
            height="1"
            maskUnits="objectBoundingBox"
            maskContentUnits="objectBoundingBox"
          >
            <rect x="0" y="0" width="1" height="1" fill="url(#sound-maze-corridor-bank-edge-fade)" />
          </mask>
          <filter id="sound-maze-road-mask-clearing-feather" x="-250" y="-250" width="1140" height="2860" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.018 0.065" numOctaves="2" seed="21" result="clearing-edge-noise" />
            <feDisplacementMap in="SourceGraphic" in2="clearing-edge-noise" scale="9" xChannelSelector="R" yChannelSelector="G" result="organic-clearing" />
            <feGaussianBlur in="organic-clearing" stdDeviation="8" />
          </filter>
          <filter id="sound-maze-road-mask-smooth-union" x="-250" y="-250" width="1140" height="2860" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5.5" result="soft-road-union" />
            <feComponentTransfer in="soft-road-union" result="threshold-road-union">
              <feFuncA type="linear" slope="18" intercept="-7.1" />
            </feComponentTransfer>
            <feGaussianBlur in="threshold-road-union" stdDeviation="0.65" />
          </filter>
          {ROAD_LAYERS.map((layer) => (
            <mask
              key={`road-mask-${layer}`}
              id={`sound-maze-road-${layer}-mask`}
              x="-200"
              y="-200"
              width="1040"
              height="2760"
              maskUnits="userSpaceOnUse"
              maskContentUnits="userSpaceOnUse"
            >
              <g
                className="sound-maze-road-mask-shapes"
                filter={layer === 'clearing'
                  ? 'url(#sound-maze-road-mask-clearing-feather)'
                  : 'url(#sound-maze-road-mask-smooth-union)'}
              >
                {mazeRoadPaths.map((path) => (
                  <path
                    key={`mask:${layer}:${path.key}`}
                    className={path.className}
                    d={path.d}
                    fill="none"
                    stroke="white"
                    strokeWidth={MAZE_ROAD_MASK_STROKE_WIDTH[layer]}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </g>
            </mask>
          ))}
        </defs>
        <g className="sound-maze-camera" style={{ transform }}>
        <rect className="sound-maze-forest-ground" x="-200" y="-520" width="1040" height="3080" />
        <FirstForkForestCorridor />
        <g className="sound-maze-unified-road-network">
          {ROAD_LAYERS.map((layer) => (
            <rect
              key={`road-surface-${layer}`}
              className={`sound-maze-unified-road-surface layer-${layer}`}
              x="-200"
              y="-200"
              width="1040"
              height="2760"
              mask={`url(#sound-maze-road-${layer}-mask)`}
            />
          ))}
        </g>
        {LEVEL_TWO_MAZE_GEOMETRY.map((geometry, index) => {
          const isPast = index < frontierIndex;
          const isCurrent = index === frontierIndex;
          const isPreview = index === previewNodeIndex;
          return (
          <g key={`maze-geometry-${index}`} className={`sound-maze-node ${isPreview ? 'is-preview' : ''}`}>
            {(isPast || isCurrent || isPreview) && <Landmark nodeIndex={index} />}
          </g>
          );
        })}
        {LEVEL_TWO_MAZE_GEOMETRY.map((geometry, index) => geometry.fragment
          && index === frontierIndex
          && focusedCorrectSide !== null
          && Math.hypot(cameraPoint.x - geometry.fragment.x, cameraPoint.y - geometry.fragment.y) < 250
          && !collectedFragmentNodes.has(index) && (
          <g key={`fragment-${index}`} className="sound-maze-map-fragment" transform={`translate(${geometry.fragment.x} ${geometry.fragment.y})`}>
            <image href={CAMPAIGN_IMAGES.soundFragmentLarge} x="-24" y="-24" width="48" height="48" />
          </g>
        ))}
        {fragmentCount === 3 && (
        <g className="sound-maze-map-exit" transform={`translate(${LEVEL_TWO_MAZE_EXIT.x} ${LEVEL_TWO_MAZE_EXIT.y})`}>
          <image
            className="sound-maze-map-exit-image"
            href={CAMPAIGN_IMAGES.soundMazeExitPortal}
            x="-62.4"
            y="-83.2"
            width="124.8"
            height="166.4"
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
        )}
        {revealedRoute && revealedRoute.side !== 'center' && (() => {
          const wall = levelTwoMagicWallPoint(viewIndex, revealedRoute.side);
          return wall ? (
            <g className="sound-maze-magic-wall" transform={`translate(${wall.x} ${wall.y}) rotate(0)`}>
              <image
                className="sound-maze-magic-wall-image"
                href={CAMPAIGN_IMAGES.soundMazeMagicMistWall}
                x="-96"
                y="-90"
                width="192"
                height="180"
                preserveAspectRatio="xMidYMid meet"
              />
            </g>
          ) : null;
        })()}
        </g>
      </svg>

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
}
