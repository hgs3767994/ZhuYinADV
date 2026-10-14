import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createLevelEightSequenceLockPuzzles,
  createSequenceLockPuzzles,
  emptySequenceLockSlots,
  placeSequenceLockCard,
  returnSequenceLockCard,
  sequenceLockMatches,
  sequenceLockReady,
  sequenceLockStars,
  type SequenceLockSlots
} from '../game/sequenceLock';
import { CAMPAIGN_IMAGES } from '../game/campaignAssets';
import { audioService } from '../services/audio';
import { CampaignAudioReplayButton } from './CampaignAudioReplayButton';

interface SequenceLockGameProps {
  variant: 'entrance' | 'magic-door';
  resultId: string;
  paused: boolean;
  inputEnabled: boolean;
  onSealCountChange: (remaining: number) => void;
  onInteractionLockChange: (locked: boolean) => void;
  onSolved: (result: {
    stars: 1 | 2 | 3;
    wrongSequenceCount: number;
    durationMs: number;
  }) => void;
}

type Feedback = 'none' | 'wrong' | 'correct';

export function SequenceLockGame({
  variant,
  resultId,
  paused,
  inputEnabled,
  onSealCountChange,
  onInteractionLockChange,
  onSolved
}: SequenceLockGameProps) {
  const puzzles = useMemo(
    () => variant === 'magic-door'
      ? createLevelEightSequenceLockPuzzles(resultId)
      : createSequenceLockPuzzles(resultId),
    [resultId, variant]
  );
  const [lockIndex, setLockIndex] = useState(0);
  const puzzle = puzzles[lockIndex];
  const [slots, setSlots] = useState<SequenceLockSlots>(() =>
    emptySequenceLockSlots(puzzles[0].cards.length)
  );
  const slotsRef = useRef(slots);
  const [wrongSequenceCount, setWrongSequenceCount] = useState(0);
  const wrongCountRef = useRef(0);
  const [feedback, setFeedback] = useState<Feedback>('none');
  const [judging, setJudging] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioCycle, setAudioCycle] = useState(0);
  const startedAtRef = useRef(performance.now());
  const pausedRef = useRef(paused);
  const mountedRef = useRef(true);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      audioService.stopSpeech();
    };
  }, []);

  useEffect(() => {
    onInteractionLockChange(judging || audioPlaying);
  }, [audioPlaying, judging, onInteractionLockChange]);

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

  const replaySequence = useCallback(
    () => audioService.speakSequence(puzzle.targetSymbols),
    [puzzle]
  );
  const stopSequence = useCallback(() => audioService.stopSpeech(), []);
  const handlePlaybackChange = useCallback((playing: boolean) => setAudioPlaying(playing), []);

  const judge = useCallback(async (nextSlots: SequenceLockSlots) => {
    if (!sequenceLockReady(nextSlots)) return;
    setJudging(true);
    if (!sequenceLockMatches(puzzle, nextSlots)) {
      const nextWrongCount = wrongCountRef.current + 1;
      wrongCountRef.current = nextWrongCount;
      setWrongSequenceCount(nextWrongCount);
      setFeedback('wrong');
      audioService.playWrong();
      await waitWhileActive(650);
      if (!mountedRef.current) return;
      const cleared = emptySequenceLockSlots(puzzle.cards.length);
      slotsRef.current = cleared;
      setSlots(cleared);
      setFeedback('none');
      setJudging(false);
      setAudioCycle((current) => current + 1);
      return;
    }

    setFeedback('correct');
    audioService.playCorrect();
    await waitWhileActive(750);
    if (!mountedRef.current) return;
    const nextLockIndex = lockIndex + 1;
    if (nextLockIndex >= puzzles.length) {
      onSealCountChange(0);
      onSolved({
        stars: sequenceLockStars(wrongCountRef.current),
        wrongSequenceCount: wrongCountRef.current,
        durationMs: Math.max(0, Math.round(performance.now() - startedAtRef.current))
      });
      return;
    }

    const freshSlots = emptySequenceLockSlots(puzzles[nextLockIndex].cards.length);
    slotsRef.current = freshSlots;
    setSlots(freshSlots);
    setLockIndex(nextLockIndex);
    setFeedback('none');
    setJudging(false);
    setAudioCycle(0);
    onSealCountChange(puzzles.length - nextLockIndex);
  }, [lockIndex, onSealCountChange, onSolved, puzzle, puzzles, waitWhileActive]);

  const selectWaitingCard = (cardId: string) => {
    if (!inputEnabled || judging || audioPlaying) return;
    const nextSlots = placeSequenceLockCard(slotsRef.current, cardId);
    if (nextSlots === slotsRef.current) return;
    slotsRef.current = nextSlots;
    setSlots(nextSlots);
    if (sequenceLockReady(nextSlots)) void judge(nextSlots);
  };

  const returnCard = (slotIndex: number) => {
    if (!inputEnabled || judging || audioPlaying) return;
    const nextSlots = returnSequenceLockCard(slotsRef.current, slotIndex);
    if (nextSlots === slotsRef.current) return;
    slotsRef.current = nextSlots;
    setSlots(nextSlots);
  };

  const selectedIds = new Set(slots.filter((cardId): cardId is string => cardId !== null));
  const cardById = new Map(puzzle.cards.map((card) => [card.id, card]));
  const controlsDisabled = !inputEnabled || judging || audioPlaying;

  return (
    <div className={`sequence-lock-game feedback-${feedback}`}>
      <div className="sequence-lock-scene" aria-hidden="true">
        <div className="sequence-lock-door">
          {puzzles.map((item, index) => (
            <img
              key={item.id}
              src={index < lockIndex ? CAMPAIGN_IMAGES.sealUnlocked : CAMPAIGN_IMAGES.sealLocked}
              alt=""
            />
          ))}
        </div>
      </div>

      <div className="sequence-lock-instruction">
        <strong>第 {lockIndex + 1} 道封印</strong>
        <span>聽完咒語後，依序放入符文</span>
      </div>

      <CampaignAudioReplayButton
        onReplay={replaySequence}
        onStop={stopSequence}
        paused={paused}
        disabled={judging}
        autoPlayKey={`${puzzle.id}:${audioCycle}`}
        label="重播聲音"
        onPlaybackChange={handlePlaybackChange}
      />

      <section className={`sequence-lock-slots ${feedback === 'wrong' ? 'is-wrong' : ''}`} aria-label="鎖孔區">
        {slots.map((cardId, index) => {
          const card = cardId ? cardById.get(cardId) : undefined;
          return card ? (
            <button
              type="button"
              key={`${index}:${card.id}`}
              className="sequence-lock-card selected"
              disabled={controlsDisabled}
              onClick={() => returnCard(index)}
              aria-label={`將 ${card.symbol} 放回待選區`}
            >
              {card.symbol}
            </button>
          ) : <span key={index} className="sequence-lock-slot-empty" aria-hidden="true" />;
        })}
      </section>

      <section className="sequence-lock-waiting" aria-label="待選區">
        {puzzle.cards.map((card) => selectedIds.has(card.id) ? (
          <span key={card.id} className="sequence-lock-waiting-empty" aria-hidden="true" />
        ) : (
          <button
            type="button"
            key={card.id}
            className="sequence-lock-card"
            disabled={controlsDisabled}
            onClick={() => selectWaitingCard(card.id)}
            aria-label={`選擇 ${card.symbol}`}
          >
            {card.symbol}
          </button>
        ))}
      </section>

      <p className="sequence-lock-feedback" aria-live="polite">
        {feedback === 'wrong' ? '順序不正確，符文已返回待選區。' :
          feedback === 'correct' ? '封印解除！' :
            wrongSequenceCount > 0 ? `已重新播放聲音，請再試一次。` : ''}
      </p>
    </div>
  );
}
