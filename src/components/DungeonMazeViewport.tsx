import type { Ref } from 'react';
import type { SoundMazeNode, SoundMazePoint, SoundMazeRoute } from '../game/soundMaze';
import { CAMPAIGN_IMAGES } from '../game/campaignAssets';
import { ConnectedDungeonRoad } from './ConnectedDungeonRoad';
import type { SoundMazeMapViewportHandle } from './SoundMazeMapViewport';

interface DungeonMazeViewportProps {
  connected?: {
    ref: Ref<SoundMazeMapViewportHandle>;
    camera: SoundMazePoint;
    completed: ReadonlyMap<number, SoundMazeRoute['side']>;
    fragmentVisible: boolean;
    paused: boolean;
    showExit: boolean;
  };
  currentNode: SoundMazeNode | null;
  viewIndex: number;
  nodeCount: number;
  atUnsolvedFork: boolean;
  exploredWrongRoutes: ReadonlySet<string>;
  focusedRouteSide: SoundMazeRoute['side'] | null;
  revealedBlockageRouteId: string | null;
  fragmentCount: number;
  fragmentAnimating: boolean;
  controlsDisabled: boolean;
  traveling: boolean;
  returning: boolean;
  deadEnd: boolean;
  onChooseRoute: (route: SoundMazeRoute) => void;
  onLeaveMaze: () => void;
}

const ROUTE_SIDES: readonly SoundMazeRoute['side'][] = ['left', 'center', 'right'];

function RubblePile() {
  return (
    <span className="dungeon-maze-rubble" aria-hidden="true">
      <i /><i /><i /><i /><i /><i /><i />
    </span>
  );
}

export function DungeonMazeViewport({
  connected,
  currentNode,
  viewIndex,
  nodeCount,
  atUnsolvedFork,
  exploredWrongRoutes,
  focusedRouteSide,
  revealedBlockageRouteId,
  fragmentCount,
  fragmentAnimating,
  controlsDisabled,
  traveling,
  returning,
  deadEnd,
  onChooseRoute,
  onLeaveMaze
}: DungeonMazeViewportProps) {
  const revealedRoute = currentNode?.routes.find((route) => route.id === revealedBlockageRouteId) ?? null;
  const routeBySide = new Map(currentNode?.routes.map((route) => [route.side, route]) ?? []);
  const className = [
    'sound-maze-viewport',
    'dungeon-maze-viewport',
    connected ? 'connected-dungeon-viewport' : null,
    atUnsolvedFork ? 'at-unsolved-fork' : null,
    traveling ? 'is-traveling' : null,
    returning ? 'is-returning' : null,
    deadEnd ? 'is-at-dead-end' : null,
    focusedRouteSide ? `focus-${focusedRouteSide}` : null
  ].filter(Boolean).join(' ');

  return (
    <div className={className} data-fork-number={currentNode ? viewIndex + 1 : undefined} aria-label="城堡地下秘道的三岔路">
      <div className="dungeon-maze-scene" aria-hidden="true">
        <div className="dungeon-maze-floor" />
        {connected ? (
          <ConnectedDungeonRoad ref={connected.ref} camera={connected.camera} index={viewIndex} nodeCount={nodeCount}
            selected={focusedRouteSide ? routeBySide.get(focusedRouteSide) ?? null : null}
            returning={returning} deadEnd={deadEnd} paused={connected.paused} fragmentVisible={connected.fragmentVisible}
            exitVisible={connected.showExit && fragmentCount === 3}
            completed={connected.completed} />
        ) : <div className="dungeon-maze-path-network">
          <span className="dungeon-maze-corridor dungeon-maze-trunk" />
          {ROUTE_SIDES.map((side) => (
            <span key={side} className={`dungeon-maze-corridor dungeon-maze-branch branch-${side}`}>
              {deadEnd && revealedRoute?.side === side && <RubblePile />}
            </span>
          ))}
        </div>}
        <div className="dungeon-maze-light" />
        <div className="dungeon-maze-darkness" />
        {currentNode && (
          <span className="dungeon-maze-node-counter">第 {viewIndex + 1}／{nodeCount} 岔路</span>
        )}
        {!currentNode && !connected && (
          <div className="dungeon-maze-exit-art">
            <span className="dungeon-maze-exit-glow">✦</span>
            <strong>秘道出口</strong>
          </div>
        )}
      </div>

      {fragmentAnimating && (
        <div className="sound-maze-fragment-collection" aria-hidden="true">
          <span className="sound-maze-fragment-light light-one" />
          <img className="sound-maze-fragment-reveal" src={CAMPAIGN_IMAGES.soundFragmentLarge} alt="" />
        </div>
      )}

      {currentNode && atUnsolvedFork && !traveling && !deadEnd && (
        <div className="dungeon-maze-route-options">
          {ROUTE_SIDES.map((side) => {
            const route = routeBySide.get(side);
            if (!route) return null;
            const explored = exploredWrongRoutes.has(route.id);
            return (
              <button
                type="button"
                key={route.id}
                className={`sound-maze-map-route dungeon-maze-route route-${side} ${explored ? 'explored-dead-end' : ''}`}
                disabled={controlsDisabled}
                onClick={() => onChooseRoute(route)}
                aria-label={explored ? `${route.symbol}，已探索的石磚死路` : `選擇 ${route.symbol} 道路`}
              >
                {route.symbol}
              </button>
            );
          })}
        </div>
      )}

      {!currentNode && (!connected || connected.showExit) && (
        <button
          type="button"
          className="dungeon-maze-exit-button"
          disabled={controlsDisabled || fragmentCount !== 3}
          onClick={onLeaveMaze}
        >
          沿著碎片光芒離開秘道
        </button>
      )}
    </div>
  );
}
