import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  createLevelFourEscort,
  createLevelSixChase,
  initialPursuitState,
  pursuitStars,
  resolvePursuitSegment,
  type PursuitRoad,
  type PursuitState
} from '../game/pursuit';
import { audioService } from '../services/audio';
import { CampaignAudioReplayButton } from './CampaignAudioReplayButton';

export interface PursuitGameStatus extends PursuitState {
  segmentNumber: number;
}

interface PursuitGameProps {
  variant: 'escort' | 'chase';
  resultId: string;
  paused: boolean;
  inputEnabled: boolean;
  onStatusChange: (status: PursuitGameStatus) => void;
  onInteractionLockChange: (locked: boolean) => void;
  onDefeat: () => void;
  onSolved: (result: {
    stars: 1 | 2 | 3;
    finalSafetyDistance: number;
    maxSuccessStreak: number;
    durationMs: number;
  }) => void;
}

type PursuitPhase = 'introducing' | 'answering' | 'resolving';
type PursuitFeedback = 'none' | 'correct' | 'wrong' | 'timeout' | 'wind';
const ANSWER_DURATION_MS = 5_000;

export function PursuitGame({
  variant,
  resultId,
  paused,
  inputEnabled,
  onStatusChange,
  onInteractionLockChange,
  onDefeat,
  onSolved
}: PursuitGameProps) {
  const segments = useMemo(
    () => variant === 'chase' ? createLevelSixChase(resultId) : createLevelFourEscort(resultId),
    [resultId, variant]
  );
  const [segmentIndex, setSegmentIndex] = useState(0);
  const segment = segments[segmentIndex];
  const [pursuitState, setPursuitState] = useState<PursuitState>(() => initialPursuitState());
  const pursuitStateRef = useRef(pursuitState);
  const [phase, setPhase] = useState<PursuitPhase>('introducing');
  const phaseRef = useRef<PursuitPhase>('introducing');
  const [feedback, setFeedback] = useState<PursuitFeedback>('none');
  const [remainingMs, setRemainingMs] = useState(ANSWER_DURATION_MS);
  const remainingMsRef = useRef(ANSWER_DURATION_MS);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const resolvingRef = useRef(false);
  const mountedRef = useRef(true);
  const pausedRef = useRef(paused);
  const startedAtRef = useRef(performance.now());
  const timeoutHandlerRef = useRef<() => void>(() => undefined);
  pausedRef.current = paused;

  const changePhase = useCallback((next: PursuitPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const initial = initialPursuitState();
    onStatusChange({ segmentNumber: 1, ...initial });
    return () => {
      mountedRef.current = false;
      audioService.stopSpeech();
    };
  }, [onStatusChange]);

  useEffect(() => {
    onInteractionLockChange(phase !== 'answering' || audioPlaying);
  }, [audioPlaying, onInteractionLockChange, phase]);

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

  const finishSegment = useCallback(async (correct: boolean, timedOut = false) => {
    if (resolvingRef.current || phaseRef.current !== 'answering') return;
    resolvingRef.current = true;
    changePhase('resolving');
    audioService.stopSpeech();

    const resolved = resolvePursuitSegment(pursuitStateRef.current, correct);
    const nextState: PursuitState = {
      safetyDistance: resolved.safetyDistance,
      successStreak: resolved.successStreak,
      maxSuccessStreak: resolved.maxSuccessStreak
    };
    pursuitStateRef.current = nextState;
    setPursuitState(nextState);
    onStatusChange({ segmentNumber: segmentIndex + 1, ...nextState });
    setFeedback(timedOut ? 'timeout' : resolved.windBoost ? 'wind' : correct ? 'correct' : 'wrong');
    correct ? audioService.playCorrect() : audioService.playWrong();

    await waitWhileActive(resolved.windBoost ? 1_000 : 760);
    if (!mountedRef.current) return;
    if (resolved.safetyDistance === 0) {
      onDefeat();
      return;
    }

    const nextSegmentIndex = segmentIndex + 1;
    if (nextSegmentIndex >= segments.length) {
      onSolved({
        stars: pursuitStars(resolved.safetyDistance),
        finalSafetyDistance: resolved.safetyDistance,
        maxSuccessStreak: resolved.maxSuccessStreak,
        durationMs: Math.max(0, Math.round(performance.now() - startedAtRef.current))
      });
      return;
    }

    remainingMsRef.current = ANSWER_DURATION_MS;
    setRemainingMs(ANSWER_DURATION_MS);
    setFeedback('none');
    setSegmentIndex(nextSegmentIndex);
    onStatusChange({ segmentNumber: nextSegmentIndex + 1, ...nextState });
    resolvingRef.current = false;
    changePhase('introducing');
  }, [changePhase, onDefeat, onSolved, onStatusChange, segmentIndex, segments.length, waitWhileActive]);

  timeoutHandlerRef.current = () => { void finishSegment(false, true); };

  useEffect(() => {
    if (phase !== 'answering' || paused) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const current = performance.now();
      remainingMsRef.current = Math.max(0, remainingMsRef.current - (current - previous));
      previous = current;
      setRemainingMs(remainingMsRef.current);
      if (remainingMsRef.current <= 0) {
        window.clearInterval(timer);
        timeoutHandlerRef.current();
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [paused, phase, segmentIndex]);

  const replayTarget = useCallback(
    () => audioService.speakSequence([segment.targetSymbol]),
    [segment.targetSymbol]
  );
  const stopTarget = useCallback(() => audioService.stopSpeech(), []);
  const handlePlaybackChange = useCallback((playing: boolean) => {
    setAudioPlaying(playing);
    if (!playing && phaseRef.current === 'introducing' && !pausedRef.current) {
      remainingMsRef.current = ANSWER_DURATION_MS;
      setRemainingMs(ANSWER_DURATION_MS);
      changePhase('answering');
    }
  }, [changePhase]);

  const chooseRoad = (road: PursuitRoad) => {
    if (!inputEnabled || phase !== 'answering' || audioPlaying) return;
    void finishSegment(road.correct);
  };

  const controlsDisabled = !inputEnabled || phase !== 'answering' || audioPlaying;
  const countdownSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));
  const sceneStyle = {
    '--mist-left': `${-48 + (5 - pursuitState.safetyDistance) * 10}%`
  } as CSSProperties;

  return (
    <div className={`pursuit-game feedback-${feedback}`}>
      <div className="pursuit-scene" style={sceneStyle}>
        {variant === 'chase'
          ? <div className="pursuit-pursuers" aria-label="後方追趕的迷霧哨兵">迷霧哨兵</div>
          : <div className="pursuit-mist" aria-label="後方逼近的黑霧" />}
        <div className="pursuit-party" aria-label="冒險者與小亞">
          <span className="pursuit-player">冒險者</span>
          <span className="pursuit-npc">小亞</span>
        </div>
        <div className="pursuit-path" aria-hidden="true">••••••••••</div>
      </div>

      <CampaignAudioReplayButton
        onReplay={replayTarget}
        onStop={stopTarget}
        paused={paused}
        disabled={phase === 'resolving'}
        autoPlayKey={segment.id}
        label="重播目標讀音"
        onPlaybackChange={handlePlaybackChange}
      />

      <section className="pursuit-choice-area" aria-label={`第 ${segmentIndex + 1} 個路段道路選項`}>
        <div className={`pursuit-countdown ${countdownSeconds <= 2 ? 'warning' : ''}`} aria-label={`剩餘 ${countdownSeconds} 秒`}>
          <div><i style={{ width: `${Math.max(0, remainingMs / ANSWER_DURATION_MS) * 100}%` }} /></div>
        </div>
        <div className="pursuit-roads">
          {segment.roads.map((road) => (
            <button
              type="button"
              key={road.id}
              disabled={controlsDisabled}
              onClick={() => chooseRoad(road)}
              aria-label={`選擇 ${road.symbol} 道路`}
            >
              <span>{road.symbol}</span>
              <small>前進</small>
            </button>
          ))}
        </div>
      </section>

      <p className="pursuit-feedback" aria-live="polite">
        {feedback === 'wind' ? '連續答對三次！疾風加速拉開了安全距離。' :
          feedback === 'correct' ? variant === 'chase'
            ? '注音水晶照亮安全道路，與追兵拉開距離！'
            : '注音水晶照亮了安全道路！' :
            feedback === 'wrong' ? variant === 'chase'
              ? '道路受阻，追兵趁機接近了。'
              : '道路受阻，後方黑霧正在接近。' :
              feedback === 'timeout' ? variant === 'chase'
                ? '時間到了，追兵趁機接近了。'
                : '時間到了，後方黑霧正在接近。' : ''}
      </p>
    </div>
  );
}
