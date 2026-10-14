import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createLevelSevenSoundMaze, createLevelTwoSoundMaze, soundMazeStars, type SoundMazeRoute } from '../game/soundMaze';
import { audioService } from '../services/audio';
import { CampaignAudioReplayButton } from './CampaignAudioReplayButton';

interface SoundMazeGameProps {
  variant: 'fork' | 'rune-gate';
  resultId: string;
  paused: boolean;
  inputEnabled: boolean;
  onFragmentCountChange: (collected: number) => void;
  onInteractionLockChange: (locked: boolean) => void;
  onSolved: (result: {
    stars: 1 | 2 | 3;
    wrongRouteCount: number;
    durationMs: number;
  }) => void;
}

type MazeFeedback = 'none' | 'moving' | 'dead-end' | 'fragment' | 'exit';

export function SoundMazeGame({
  variant,
  resultId,
  paused,
  inputEnabled,
  onFragmentCountChange,
  onInteractionLockChange,
  onSolved
}: SoundMazeGameProps) {
  const nodes = useMemo(
    () => variant === 'rune-gate' ? createLevelSevenSoundMaze(resultId) : createLevelTwoSoundMaze(resultId),
    [resultId, variant]
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

  const currentNode = viewIndex < nodes.length ? nodes[viewIndex] : null;
  const atUnsolvedFork = currentNode !== null && viewIndex === frontierIndex;
  const controlsDisabled = !inputEnabled || busy || audioPlaying;

  const replayTarget = useCallback(() => {
    if (!currentNode || !atUnsolvedFork) return Promise.resolve();
    return audioService.speakSequence([currentNode.targetSymbol]);
  }, [atUnsolvedFork, currentNode]);
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
      setExploredWrongRoutes((current) => new Set(current).add(route.id));
      setFeedback('dead-end');
      audioService.playWrong();
      await waitWhileActive(900);
      if (!mountedRef.current) return;
      setFeedback('none');
      busyRef.current = false;
      setBusy(false);
      setAudioCycle((current) => current + 1);
      return;
    }

    audioService.playCorrect();
    const collectedFragment = currentNode.fragment;
    setFeedback(collectedFragment ? 'fragment' : 'moving');
    await waitWhileActive(collectedFragment ? 900 : 650);
    if (!mountedRef.current) return;
    let nextFragmentCount = fragmentCount;
    if (collectedFragment) {
      nextFragmentCount += 1;
      setFragmentCount(nextFragmentCount);
      onFragmentCountChange(nextFragmentCount);
    }
    const nextFrontier = frontierIndex + 1;
    setFrontierIndex(nextFrontier);
    setViewIndex(nextFrontier);
    setFeedback(nextFrontier === nodes.length ? 'exit' : 'none');
    busyRef.current = false;
    setBusy(false);
    setAudioCycle(0);
  };

  const moveToExploredNode = async (nextIndex: number) => {
    if (controlsDisabled || busyRef.current || nextIndex < 0 || nextIndex > frontierIndex) return;
    audioService.stopSpeech();
    busyRef.current = true;
    setBusy(true);
    setFeedback('moving');
    await waitWhileActive(420);
    if (!mountedRef.current) return;
    setViewIndex(nextIndex);
    setFeedback(nextIndex === nodes.length ? 'exit' : 'none');
    busyRef.current = false;
    setBusy(false);
  };

  const leaveMaze = async () => {
    if (controlsDisabled || busyRef.current || frontierIndex !== nodes.length || fragmentCount !== 3) return;
    busyRef.current = true;
    setBusy(true);
    setFeedback('moving');
    audioService.playCorrect();
    await waitWhileActive(800);
    if (!mountedRef.current) return;
    onSolved({
      stars: soundMazeStars(wrongCountRef.current),
      wrongRouteCount: wrongCountRef.current,
      durationMs: Math.max(0, Math.round(performance.now() - startedAtRef.current))
    });
  };

  return (
    <div className={`sound-maze-game feedback-${feedback}`}>
      <div className="sound-maze-viewport">
        <div className="sound-maze-fog fog-left" aria-hidden="true" />
        <div className="sound-maze-fog fog-right" aria-hidden="true" />
        <div className="sound-maze-path-history" aria-hidden="true">
          {viewIndex > 0 ? '•••' : '·'}
        </div>
        <div className="sound-maze-player" aria-label="冒險者目前位置">◆</div>

        {currentNode && atUnsolvedFork && (
          <div className={`sound-maze-fork ${variant === 'rune-gate' ? 'sound-maze-rune-gates' : ''}`}>
            {currentNode.routes.map((route) => {
              const explored = exploredWrongRoutes.has(route.id);
              return (
                <button
                  type="button"
                  key={route.id}
                  className={`sound-maze-route ${variant === 'rune-gate' ? 'sound-maze-rune-gate' : ''} ${explored ? 'explored-dead-end' : ''}`}
                  disabled={controlsDisabled}
                  onClick={() => void chooseRoute(route)}
                  aria-label={explored
                    ? `${route.symbol}，已探索的${variant === 'rune-gate' ? '廢棄通道' : '迷霧死路'}`
                    : `選擇 ${route.symbol} ${variant === 'rune-gate' ? '符文門' : '道路'}`}
                >
                  <span>{route.symbol}</span>
                  <small>{explored ? (variant === 'rune-gate' ? '廢棄通道' : '迷霧死路') : (variant === 'rune-gate' ? '符文門' : '前往')}</small>
                </button>
              );
            })}
          </div>
        )}

        {currentNode && !atUnsolvedFork && (
          <div className="sound-maze-explored-path">
            <strong>{variant === 'rune-gate' ? '已開啟的符文門' : '已探索的岔路'}</strong>
            <span aria-hidden="true">✦</span>
          </div>
        )}

        {!currentNode && (
          <button
            type="button"
            className="sound-maze-exit"
            disabled={controlsDisabled || fragmentCount !== 3}
            onClick={() => void leaveMaze()}
          >
            <span aria-hidden="true">✦</span>
            <strong>沿著光芒前往{variant === 'rune-gate' ? '秘道出口' : '迷霧出口'}</strong>
          </button>
        )}
      </div>

      {currentNode && atUnsolvedFork && (
        <CampaignAudioReplayButton
          onReplay={replayTarget}
          onStop={stopTarget}
          paused={paused}
          disabled={busy}
          autoPlayKey={`${currentNode.id}:${audioCycle}`}
          label="重播目標讀音"
          onPlaybackChange={handlePlaybackChange}
        />
      )}

      <div className="sound-maze-navigation">
        <button type="button" disabled={controlsDisabled || viewIndex === 0} onClick={() => void moveToExploredNode(viewIndex - 1)}>
          返回上一{variant === 'rune-gate' ? '道符文門' : '個岔路'}
        </button>
        {viewIndex < frontierIndex && (
          <button type="button" disabled={controlsDisabled} onClick={() => void moveToExploredNode(viewIndex + 1)}>
            沿發光道路前進
          </button>
        )}
      </div>

      <p className="sound-maze-feedback" aria-live="polite">
        {feedback === 'dead-end' ? variant === 'rune-gate'
          ? '錯誤符文門通往廢棄通道，正在返回原本的位置。'
          : '前方是迷霧死路，正在返回原本的岔路。' :
          feedback === 'fragment' ? `找到第 ${fragmentCount + 1} 枚聲音碎片！` :
            feedback === 'exit' ? `三枚碎片形成了通往${variant === 'rune-gate' ? '秘道' : '迷霧'}出口的光芒。` :
              feedback === 'moving' ? '冒險者正沿著道路前進…' :
                wrongRouteCount > 0 ? variant === 'rune-gate'
                  ? '已探索的廢棄通道會留下迷霧記號。'
                  : '已探索的死路會留下迷霧記號。' : ''}
      </p>
    </div>
  );
}
