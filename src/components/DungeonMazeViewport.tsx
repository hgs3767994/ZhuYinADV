import type { Ref } from 'react';
import type { SoundMazeNode, SoundMazePoint, SoundMazeRoute } from '../game/soundMaze';
import { CAMPAIGN_IMAGES } from '../game/campaignAssets';
import { ConnectedDungeonRoad } from './ConnectedDungeonRoad';
import type { SoundMazeMapViewportHandle } from './SoundMazeMapViewport';

interface DungeonMazeViewportProps {
  connected: {
    ref: Ref<SoundMazeMapViewportHandle>;
    camera: SoundMazePoint;
    completed: ReadonlyMap<number, SoundMazeRoute['side']>;
    fragmentVisible: boolean;
    paused: boolean;
  };
  currentNode: SoundMazeNode | null;
  viewIndex: number;
  nodeCount: number;
  atUnsolvedFork: boolean;
  exploredWrongRoutes: ReadonlySet<string>;
  focusedRouteSide: SoundMazeRoute['side'] | null;
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

export function DungeonMazeViewport({
  connected,
  currentNode,
  viewIndex,
  nodeCount,
  atUnsolvedFork,
  exploredWrongRoutes,
  focusedRouteSide,
  fragmentCount,
  fragmentAnimating,
  controlsDisabled,
  traveling,
  returning,
  deadEnd,
  onChooseRoute,
  onLeaveMaze
}: DungeonMazeViewportProps) {
  const atExit = !currentNode && fragmentCount === 3;
  const routeBySide = new Map(currentNode?.routes.map((route) => [route.side, route]) ?? []);
  return (
    <div className="sound-maze-viewport dungeon-maze-viewport connected-dungeon-viewport" aria-label="城堡地下秘道的三岔路">
      <div className="dungeon-maze-scene" aria-hidden="true">
        <div className="dungeon-maze-floor" />
        <ConnectedDungeonRoad ref={connected.ref} camera={connected.camera} index={viewIndex} nodeCount={nodeCount}
          selected={focusedRouteSide ? routeBySide.get(focusedRouteSide) ?? null : null}
          returning={returning} deadEnd={deadEnd} paused={connected.paused} fragmentVisible={connected.fragmentVisible}
          exitVisible={fragmentCount === 3}
          completed={connected.completed} />
        <div className="dungeon-maze-light" />
        <div className="dungeon-maze-darkness" />
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

      {atExit && (
        <button
          type="button"
          className="sound-maze-map-exit-hitbox"
          disabled={controlsDisabled}
          onClick={onLeaveMaze}
          aria-label="點擊光芒出口離開秘道"
        />
      )}
    </div>
  );
}
