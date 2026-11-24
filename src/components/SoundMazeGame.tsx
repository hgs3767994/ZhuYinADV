import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createLevelSevenSoundMaze,
  createLevelTwoSoundMaze,
  levelTwoConnectorPoints,
  levelTwoForkRoutePoints,
  levelTwoWrongRouteTravelPoints,
  LEVEL_TWO_MAZE_GEOMETRY,
  soundMazeStars,
  type SoundMazePoint,
  type SoundMazeRoute
} from '../game/soundMaze';
import { audioService } from '../services/audio';
import { CampaignAudioReplayButton } from './CampaignAudioReplayButton';
import {
  SoundMazeMapViewport,
  type SoundMazeMapViewportHandle
} from './SoundMazeMapViewport';
import { DungeonMazeViewport } from './DungeonMazeViewport';
import { CONNECTED_DUNGEON_SPEED, connectedDungeonFork, connectedDungeonPath } from './ConnectedDungeonRoad';

interface SoundMazeGameProps {
  variant: 'fork' | 'dungeon-fork';
  resultId: string;
  paused: boolean;
  inputEnabled: boolean;
  suppressAudio?: boolean;
  connectedDungeon?: 'sample' | 'full';
  onFragmentCountChange: (collected: number) => void;
  onInteractionLockChange: (locked: boolean) => void;
  onSolved: (result: {
    stars: 1 | 2 | 3;
    wrongRouteCount: number;
    durationMs: number;
  }) => void;
}

type MazeFeedback = 'none' | 'moving' | 'dead-end' | 'fragment' | 'exit';

function fragmentAnimationDuration(): number {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 120 : 1650;
}

function routeFadeDuration(): number {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 280;
}

function splitPathAtNearestPoint(
  points: readonly SoundMazePoint[],
  target: SoundMazePoint
): readonly [readonly SoundMazePoint[], readonly SoundMazePoint[]] {
  const splitIndex = points.reduce((nearest, point, index) => {
    const distance = Math.hypot(point.x - target.x, point.y - target.y);
    const nearestPoint = points[nearest];
    return distance < Math.hypot(nearestPoint.x - target.x, nearestPoint.y - target.y) ? index : nearest;
  }, 0);
  return [points.slice(0, splitIndex + 1), points.slice(splitIndex)];
}

export function SoundMazeGame({
  variant,
  resultId,
  paused,
  inputEnabled,
  suppressAudio = false,
  connectedDungeon,
  onFragmentCountChange,
  onInteractionLockChange,
  onSolved
}: SoundMazeGameProps) {
  const nodes = useMemo(
    () => {
      if (variant !== 'dungeon-fork') return createLevelTwoSoundMaze(resultId);
      const dungeonNodes = createLevelSevenSoundMaze(resultId);
      return connectedDungeon === 'sample' ? dungeonNodes.slice(0, 2) : dungeonNodes;
    },
    [connectedDungeon, resultId, variant]
  );
  const [frontierIndex, setFrontierIndex] = useState(0);
  const [viewIndex, setViewIndex] = useState(0);
  const [fragmentCount, setFragmentCount] = useState(0);
  const [wrongRouteCount, setWrongRouteCount] = useState(0);
  const wrongCountRef = useRef(0);
  const [exploredWrongRoutes, setExploredWrongRoutes] = useState<ReadonlySet<string>>(() => new Set());
  const [feedback, setFeedback] = useState<MazeFeedback>('none');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioCycle, setAudioCycle] = useState(0);
  const [cameraPoint, setCameraPoint] = useState<SoundMazePoint>(() =>
    connectedDungeon ? connectedDungeonFork(0) : LEVEL_TWO_MAZE_GEOMETRY[0].fork);
  const [connectedChoices, setConnectedChoices] = useState<ReadonlyMap<number, SoundMazeRoute['side']>>(() => new Map());
  const [revealedWallRouteId, setRevealedWallRouteId] = useState<string | null>(null);
  const [focusedRouteSide, setFocusedRouteSide] = useState<SoundMazeRoute['side'] | null>(null);
  const [restoringWrongRoute, setRestoringWrongRoute] = useState(false);
  const [chosenCorrectRoutes, setChosenCorrectRoutes] = useState<ReadonlyMap<number, 'left' | 'right'>>(() => new Map());
  const [collectedFragmentNodes, setCollectedFragmentNodes] = useState<ReadonlySet<number>>(() => new Set());
  const mapViewportRef = useRef<SoundMazeMapViewportHandle>(null);
  const startedAtRef = useRef(performance.now());
  const pausedRef = useRef(paused);
  const mountedRef = useRef(true);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      audioService.stopSpeech();
    };
  }, []);
  useEffect(() => {
    onInteractionLockChange(busy || audioPlaying);
  }, [audioPlaying, busy, onInteractionLockChange]);

  const waitWhileActive = useCallback((durationMs: number) => new Promise<void>((resolve) => {
    let remaining = durationMs;
    let previous = performance.now();
    const tick = () => {
      if (!mountedRef.current) {
        resolve();
        return;
      }
      const current = performance.now();
      if (!pausedRef.current) remaining -= current - previous;
      previous = current;
      if (remaining <= 0) resolve();
      else window.setTimeout(tick, 40);
    };
    window.setTimeout(tick, 40);
  }), []);

  const moveCameraAlong = useCallback((
    points: readonly SoundMazePoint[],
    speed = 165,
    onProgress?: (progress: number) => void
  ) => new Promise<void>((resolve) => {
    if (points.length === 0) {
      resolve();
      return;
    }
    if (points.length === 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const destination = points[points.length - 1];
      mapViewportRef.current?.setCameraPoint(destination);
      setCameraPoint(destination);
      onProgress?.(1);
      resolve();
      return;
    }
    const lengths = points.slice(1).map((point, index) => Math.hypot(
      point.x - points[index].x,
      point.y - points[index].y
    ));
    const totalLength = lengths.reduce((total, length) => total + length, 0);
    let segmentIndex = 0;
    let segmentOffset = 0;
    let travelled = 0;
    let previousTime: number | null = null;

    const tick = (time: number) => {
      if (!mountedRef.current) {
        resolve();
        return;
      }
      if (previousTime === null) previousTime = time;
      if (pausedRef.current) {
        previousTime = time;
        window.requestAnimationFrame(tick);
        return;
      }
      let movement = speed * Math.min(48, time - previousTime) / 1000;
      previousTime = time;
      while (movement > 0 && segmentIndex < lengths.length) {
        const remaining = lengths[segmentIndex] - segmentOffset;
        const consumed = Math.min(movement, remaining);
        segmentOffset += consumed;
        travelled += consumed;
        movement -= consumed;
        if (segmentOffset >= lengths[segmentIndex] - 0.001) {
          segmentIndex += 1;
          segmentOffset = 0;
        }
      }
      if (segmentIndex >= lengths.length) {
        const destination = points[points.length - 1];
        mapViewportRef.current?.setCameraPoint(destination);
        setCameraPoint(destination);
        onProgress?.(1);
        resolve();
        return;
      }
      const start = points[segmentIndex];
      const end = points[segmentIndex + 1];
      const amount = lengths[segmentIndex] === 0 ? 1 : segmentOffset / lengths[segmentIndex];
      mapViewportRef.current?.setCameraPoint({
        x: start.x + (end.x - start.x) * amount,
        y: start.y + (end.y - start.y) * amount
      });
      onProgress?.(totalLength === 0 ? 1 : travelled / totalLength);
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  }), []);

  const currentNode = viewIndex < nodes.length ? nodes[viewIndex] : null;
  const atUnsolvedFork = currentNode !== null && viewIndex === frontierIndex;
  const controlsDisabled = !inputEnabled || busy || audioPlaying;

  const replayTarget = useCallback(() => {
    if (!currentNode || !atUnsolvedFork) return Promise.resolve();
    if (suppressAudio) return Promise.resolve();
    return audioService.speakSequence([currentNode.targetSymbol]);
  }, [atUnsolvedFork, currentNode, suppressAudio]);
  const stopTarget = useCallback(() => audioService.stopSpeech(), []);
  const handlePlaybackChange = useCallback((playing: boolean) => setAudioPlaying(playing), []);

  const chooseRoute = async (route: SoundMazeRoute) => {
    if (!atUnsolvedFork || controlsDisabled || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    if (!route.correct) {
      const nextWrongCount = wrongCountRef.current + 1;
      wrongCountRef.current = nextWrongCount;
      setWrongRouteCount(nextWrongCount);
      if (variant === 'fork' && route.side !== 'center') {
        const wrongPath = levelTwoWrongRouteTravelPoints(viewIndex, route.side);
        setFocusedRouteSide(route.side);
        setRevealedWallRouteId(route.id);
        setFeedback('moving');
        await waitWhileActive(routeFadeDuration());
        if (!mountedRef.current) return;
        await moveCameraAlong(wrongPath, 165);
        if (!mountedRef.current) return;
        setFeedback('dead-end');
        if (!suppressAudio) audioService.playWrong();
        await waitWhileActive(720);
        if (!mountedRef.current) return;
        setFeedback('moving');
        await moveCameraAlong([...wrongPath].reverse(), 165);
      } else if (connectedDungeon) {
        const { approach } = connectedDungeonPath(viewIndex, route.side, false, nodes.length);
        setFocusedRouteSide(route.side);
        setRevealedWallRouteId(route.id);
        setFeedback('moving');
        await waitWhileActive(routeFadeDuration());
        if (!mountedRef.current) return;
        await moveCameraAlong(approach, CONNECTED_DUNGEON_SPEED);
        if (!mountedRef.current) return;
        setFeedback('dead-end');
        if (!suppressAudio) audioService.playWrong();
        await waitWhileActive(720);
        if (!mountedRef.current) return;
        setFeedback('moving');
        await moveCameraAlong([...approach].reverse(), CONNECTED_DUNGEON_SPEED);
        if (!mountedRef.current) return;
        setRestoringWrongRoute(true);
      } else if (variant === 'dungeon-fork') {
        setFocusedRouteSide(route.side);
        setRevealedWallRouteId(route.id);
        setFeedback('moving');
        await waitWhileActive(1100);
        if (!mountedRef.current) return;
        setFeedback('dead-end');
        if (!suppressAudio) audioService.playWrong();
        await waitWhileActive(720);
        if (!mountedRef.current) return;
        setRestoringWrongRoute(true);
        setFeedback('moving');
        await waitWhileActive(1100);
      } else {
        setFeedback('dead-end');
        if (!suppressAudio) audioService.playWrong();
        await waitWhileActive(900);
      }
      if (!mountedRef.current) return;
      setExploredWrongRoutes((current) => new Set(current).add(route.id));
      setRevealedWallRouteId(null);
      if (variant !== 'dungeon-fork') setRestoringWrongRoute(true);
      // Keep the selected road beneath the restoring layer until it is opaque.
      await waitWhileActive(variant === 'dungeon-fork' && !connectedDungeon ? 120 : routeFadeDuration());
      if (!mountedRef.current) return;
      setFocusedRouteSide(null);
      setRestoringWrongRoute(false);
      setFeedback('none');
      busyRef.current = false;
      setBusy(false);
      setAudioCycle((current) => current + 1);
      return;
    }

    if (!suppressAudio) audioService.playCorrect();
    const collectedFragment = currentNode.fragment;
    let completedForkSide: 'left' | 'right' | null = null;
    if (variant === 'fork' && route.side !== 'center') {
      const chosenSide = route.side;
      completedForkSide = chosenSide;
      setFocusedRouteSide(chosenSide);
      setFeedback('moving');
      await waitWhileActive(routeFadeDuration());
      if (!mountedRef.current) return;
      await moveCameraAlong(levelTwoForkRoutePoints(viewIndex, chosenSide), 165);
      if (!mountedRef.current) return;
      const connector = levelTwoConnectorPoints(viewIndex);
      if (collectedFragment && LEVEL_TWO_MAZE_GEOMETRY[viewIndex].fragment) {
        const [beforeFragment, afterFragment] = splitPathAtNearestPoint(
          connector,
          LEVEL_TWO_MAZE_GEOMETRY[viewIndex].fragment!
        );
        await moveCameraAlong(beforeFragment, 165);
        if (!mountedRef.current) return;
        setCollectedFragmentNodes((current) => new Set(current).add(viewIndex));
        setFeedback('fragment');
        await waitWhileActive(fragmentAnimationDuration());
        if (!mountedRef.current) return;
        const nextFragmentCount = fragmentCount + 1;
        setFragmentCount(nextFragmentCount);
        onFragmentCountChange(nextFragmentCount);
        setFeedback('moving');
        await moveCameraAlong(afterFragment, 165);
      } else {
        await moveCameraAlong(connector, 165);
      }
      if (!mountedRef.current) return;
    } else if (connectedDungeon) {
      const { approach, onward } = connectedDungeonPath(viewIndex, route.side, true, nodes.length);
      setFocusedRouteSide(route.side);
      setFeedback('moving');
      await waitWhileActive(routeFadeDuration());
      if (!mountedRef.current) return;
      await moveCameraAlong(approach, CONNECTED_DUNGEON_SPEED);
      if (!mountedRef.current) return;
      if (collectedFragment) {
        setCollectedFragmentNodes((current) => new Set(current).add(viewIndex));
        setFeedback('fragment');
        await waitWhileActive(fragmentAnimationDuration());
        if (!mountedRef.current) return;
        setFragmentCount(fragmentCount + 1);
        onFragmentCountChange(fragmentCount + 1);
        setFeedback('moving');
      }
      await moveCameraAlong(onward, CONNECTED_DUNGEON_SPEED);
      if (!mountedRef.current) return;
      setConnectedChoices((current) => new Map(current).set(viewIndex, route.side));
    } else {
      setFocusedRouteSide(route.side);
      setFeedback('moving');
      await waitWhileActive(1100);
      if (!mountedRef.current) return;
      setFeedback(collectedFragment ? 'fragment' : 'moving');
      await waitWhileActive(collectedFragment ? fragmentAnimationDuration() : 180);
      if (!mountedRef.current) return;
      if (collectedFragment) {
        const nextFragmentCount = fragmentCount + 1;
        setFragmentCount(nextFragmentCount);
        onFragmentCountChange(nextFragmentCount);
      }
    }
    if (completedForkSide !== null) {
      setChosenCorrectRoutes((current) => new Map(current).set(viewIndex, completedForkSide));
    }
    const nextFrontier = frontierIndex + 1;
    setFrontierIndex(nextFrontier);
    setViewIndex(nextFrontier);
    setFocusedRouteSide(null);
    setFeedback(nextFrontier === nodes.length ? 'exit' : 'none');
    busyRef.current = false;
    setBusy(false);
    setAudioCycle(0);
  };

  const leaveMaze = async () => {
    if (controlsDisabled || busyRef.current || frontierIndex !== nodes.length || fragmentCount !== 3) return;
    busyRef.current = true;
    setBusy(true);
    setFeedback('moving');
    if (!suppressAudio) audioService.playCorrect();
    await waitWhileActive(800);
    if (!mountedRef.current) return;
    onSolved({
      stars: soundMazeStars(wrongCountRef.current),
      wrongRouteCount: wrongCountRef.current,
      durationMs: Math.max(0, Math.round(performance.now() - startedAtRef.current))
    });
  };

  return (
    <div className={`sound-maze-game feedback-${feedback} ${paused ? 'is-paused' : ''}`}>
      {variant === 'fork' ? (
        <SoundMazeMapViewport
          ref={mapViewportRef}
          nodes={nodes}
          viewIndex={viewIndex}
          frontierIndex={frontierIndex}
          cameraPoint={cameraPoint}
          exploredWrongRoutes={exploredWrongRoutes}
          revealedWallRouteId={revealedWallRouteId}
          focusedRouteSide={focusedRouteSide as 'left' | 'right' | null}
          restoringWrongRoute={restoringWrongRoute}
          chosenCorrectRoutes={chosenCorrectRoutes}
          collectedFragmentNodes={collectedFragmentNodes}
          fragmentCount={fragmentCount}
          fragmentAnimating={feedback === 'fragment'}
          controlsDisabled={controlsDisabled}
          onChooseRoute={(route) => void chooseRoute(route)}
          onLeaveMaze={() => void leaveMaze()}
          traveling={busy && feedback !== 'dead-end'}
        />
      ) : (
        <DungeonMazeViewport
          connected={connectedDungeon ? {
            ref: mapViewportRef, camera: cameraPoint, completed: connectedChoices,
            paused,
            showExit: connectedDungeon === 'full',
            fragmentVisible: currentNode?.fragment === true && !collectedFragmentNodes.has(viewIndex)
          } : undefined}
          currentNode={currentNode}
          viewIndex={viewIndex}
          nodeCount={nodes.length}
          atUnsolvedFork={atUnsolvedFork}
          exploredWrongRoutes={exploredWrongRoutes}
          focusedRouteSide={focusedRouteSide}
          revealedBlockageRouteId={revealedWallRouteId}
          fragmentCount={fragmentCount}
          fragmentAnimating={feedback === 'fragment'}
          controlsDisabled={controlsDisabled}
          traveling={busy && feedback !== 'dead-end'}
          returning={restoringWrongRoute}
          deadEnd={feedback === 'dead-end'}
          onChooseRoute={(route) => void chooseRoute(route)}
          onLeaveMaze={() => void leaveMaze()}
        />
      )}

      {currentNode && atUnsolvedFork && (
        <CampaignAudioReplayButton
          onReplay={replayTarget}
          onStop={stopTarget}
          paused={paused}
          disabled={busy}
          autoPlayKey={`${currentNode.id}:${audioCycle}`}
          playbackTimeoutMs={variant === 'dungeon-fork' ? 5000 : undefined}
          label="重播目標讀音"
          onPlaybackChange={handlePlaybackChange}
        />
      )}

      <p className="sound-maze-feedback" aria-live="polite">
        {connectedDungeon === 'sample' && feedback === 'exit' ? '兩個岔路皆已通過。' : feedback === 'dead-end' ? variant === 'dungeon-fork'
          ? '前方被倒塌的石磚阻擋，正在返回原本的岔路。'
          : '前方是迷霧死路，正在返回原本的岔路。' :
          feedback === 'fragment' ? `找到第 ${fragmentCount + 1} 枚聲音碎片！` :
            feedback === 'exit' ? (
              <>
                <span className="sound-maze-feedback-line">三枚碎片形成了通往{variant === 'dungeon-fork' ? '秘道' : '迷霧'}出口的光芒，</span>
                <span className="sound-maze-feedback-line">沿著光芒離開{variant === 'dungeon-fork' ? '秘道' : '迷霧'}</span>
              </>
            ) :
              feedback === 'moving' ? '冒險者正沿著道路前進…' :
                wrongRouteCount > 0 ? variant === 'dungeon-fork'
                  ? '已探索的石磚死路會以灰色注音按鈕標示。'
                  : '已探索的死路會以灰色注音按鈕標示。' : ''}
      </p>
    </div>
  );
}
