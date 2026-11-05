import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createMemoryBattlePlan,
  createMemoryColorAssignments,
  createMemoryExplorePlan,
  memoryBattleStars,
  memoryBattleLivesAfterMistake,
  memoryExplorePairMatches,
  memoryExploreStars,
  MEMORY_GROUP_COUNT,
  replaceAndReshuffleMemoryGroup,
  type MemoryExploreLayout
} from '../game/memoryExplore';
import { CAMPAIGN_IMAGES } from '../game/campaignAssets';
import { audioService } from '../services/audio';
import { CampaignAudioReplayButton } from './CampaignAudioReplayButton';

interface MemoryExploreGameProps {
  variant: 'explore' | 'battle';
  resultId: string;
  paused: boolean;
  inputEnabled: boolean;
  onSealCountChange: (remaining: number) => void;
  onLifeChange: (remaining: number) => void;
  onInteractionLockChange: (locked: boolean) => void;
  onDefeat: () => void;
  onSolved: (result: {
    stars: 1 | 2 | 3;
    wrongPairCount: number;
    remainingLives: number;
    durationMs: number;
  }) => void;
}

type MemoryPhase = 'memorize' | 'prompt' | 'judging';
type MemoryFeedback = 'none' | 'wrong' | 'attack' | 'correct';
type ExploreCompletionPhase = 'playing' | 'all-unlocked' | 'seals-fading' | 'smiling' | 'smile-hold';
const MEMORY_DURATION_MS = 5_000;

const exploreCompletionDurations = () => {
  const reducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reducedMotion
    ? { unlockHold: 80, sealFade: 120, faceCrossfade: 160, smileHold: 320 }
    : { unlockHold: 250, sealFade: 450, faceCrossfade: 650, smileHold: 1_000 };
};

export function MemoryExploreGame({
  variant,
  resultId,
  paused,
  inputEnabled,
  onSealCountChange,
  onLifeChange,
  onInteractionLockChange,
  onDefeat,
  onSolved
}: MemoryExploreGameProps) {
  const plan = useMemo(
    () => variant === 'battle' ? createMemoryBattlePlan(resultId) : createMemoryExplorePlan(resultId),
    [resultId, variant]
  );
  const [layout, setLayout] = useState<MemoryExploreLayout>(plan.cards);
  const [symbolColorIndexes, setSymbolColorIndexes] = useState<ReadonlyMap<string, number>>(
    () => createMemoryColorAssignments(plan.cards)
  );
  const [roundIndex, setRoundIndex] = useState(0);
  const [unlockedSealCount, setUnlockedSealCount] = useState(0);
  const [completionPhase, setCompletionPhase] = useState<ExploreCompletionPhase>('playing');
  const targetSymbol = plan.targetSymbols[roundIndex];
  const [phase, setPhase] = useState<MemoryPhase>('memorize');
  const [selectedCardIds, setSelectedCardIds] = useState<readonly string[]>([]);
  const [wrongPairCount, setWrongPairCount] = useState(0);
  const wrongCountRef = useRef(0);
  const [lives, setLives] = useState(5);
  const livesRef = useRef(5);
  const [feedback, setFeedback] = useState<MemoryFeedback>('none');
  const [audioPlaying, setAudioPlaying] = useState(false);
  const memoryRemainingRef = useRef(MEMORY_DURATION_MS);
  const startedAtRef = useRef(performance.now());
  const pausedRef = useRef(paused);
  const mountedRef = useRef(true);
  const judgingRef = useRef(false);

  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => {
    mountedRef.current = true;
    onSealCountChange(MEMORY_GROUP_COUNT);
    onLifeChange(5);
    return () => {
      mountedRef.current = false;
      audioService.stopSpeech();
    };
  }, [onLifeChange, onSealCountChange]);

  useEffect(() => {
    onInteractionLockChange(phase !== 'prompt' || audioPlaying);
  }, [audioPlaying, onInteractionLockChange, phase]);

  useEffect(() => {
    if (phase !== 'memorize' || paused) return;
    const started = performance.now();
    let completed = false;
    const timer = window.setTimeout(() => {
      completed = true;
      memoryRemainingRef.current = 0;
      setPhase('prompt');
    }, memoryRemainingRef.current);
    return () => {
      window.clearTimeout(timer);
      if (!completed) {
        memoryRemainingRef.current = Math.max(
          0,
          memoryRemainingRef.current - (performance.now() - started)
        );
      }
    };
  }, [paused, phase, roundIndex]);

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

  const replayTarget = useCallback(
    () => audioService.speakSequence([targetSymbol]),
    [targetSymbol]
  );
  const stopTarget = useCallback(() => audioService.stopSpeech(), []);

  const judgePair = useCallback(async (cardIds: readonly string[]) => {
    judgingRef.current = true;
    setPhase('judging');
    if (!memoryExplorePairMatches(layout, cardIds, targetSymbol)) {
      const nextWrongCount = wrongCountRef.current + 1;
      wrongCountRef.current = nextWrongCount;
      setWrongPairCount(nextWrongCount);
      setFeedback('wrong');
      audioService.playWrong();
      await waitWhileActive(variant === 'battle' ? 420 : 850);
      if (!mountedRef.current) return;
      setSelectedCardIds([]);
      if (variant === 'battle') {
        const nextLives = memoryBattleLivesAfterMistake(livesRef.current);
        livesRef.current = nextLives;
        setLives(nextLives);
        onLifeChange(nextLives);
        setFeedback('attack');
        await waitWhileActive(650);
        if (!mountedRef.current) return;
        if (nextLives === 0) {
          onDefeat();
          return;
        }
      }
      setFeedback('none');
      judgingRef.current = false;
      setPhase('prompt');
      return;
    }

    setSelectedCardIds(layout
      .filter((card) => card.symbol === targetSymbol)
      .map((card) => card.id));
    setFeedback('correct');
    audioService.playCorrect();
    await waitWhileActive(900);
    if (!mountedRef.current) return;
    const completedPairs = roundIndex + 1;
    onSealCountChange(MEMORY_GROUP_COUNT - completedPairs);
    if (variant === 'explore') setUnlockedSealCount(completedPairs);
    if (completedPairs === plan.targetSymbols.length) {
      if (variant === 'explore') {
        const durations = exploreCompletionDurations();
        setCompletionPhase('all-unlocked');
        await waitWhileActive(durations.unlockHold);
        if (!mountedRef.current) return;
        setCompletionPhase('seals-fading');
        await waitWhileActive(durations.sealFade);
        if (!mountedRef.current) return;
        setCompletionPhase('smiling');
        await waitWhileActive(durations.faceCrossfade);
        if (!mountedRef.current) return;
        setCompletionPhase('smile-hold');
        await waitWhileActive(durations.smileHold);
        if (!mountedRef.current) return;
      }
      onSolved({
        stars: variant === 'battle'
          ? memoryBattleStars(livesRef.current)
          : memoryExploreStars(wrongCountRef.current),
        wrongPairCount: wrongCountRef.current,
        remainingLives: livesRef.current,
        durationMs: Math.max(0, Math.round(performance.now() - startedAtRef.current))
      });
      return;
    }

    const nextLayout = replaceAndReshuffleMemoryGroup(
      layout,
      targetSymbol,
      plan.replacementSymbols[roundIndex]!,
      plan.id,
      roundIndex
    );
    setLayout(nextLayout);
    setSymbolColorIndexes((previous) => createMemoryColorAssignments(nextLayout, previous));
    setSelectedCardIds([]);
    setFeedback('none');
    memoryRemainingRef.current = MEMORY_DURATION_MS;
    setRoundIndex(completedPairs);
    judgingRef.current = false;
    setPhase('memorize');
  }, [layout, onDefeat, onLifeChange, onSealCountChange, onSolved, plan.id, plan.replacementSymbols, plan.targetSymbols.length, roundIndex, targetSymbol, variant, waitWhileActive]);

  const selectCard = (cardId: string) => {
    if (!inputEnabled || phase !== 'prompt' || audioPlaying || judgingRef.current || selectedCardIds.includes(cardId)) return;
    const next = [...selectedCardIds, cardId];
    setSelectedCardIds(next);
    if (next.length === 2) void judgePair(next);
  };

  const cardsFaceUp = phase === 'memorize';
  const controlsDisabled = !inputEnabled || phase !== 'prompt' || audioPlaying;
  const displayedUnlockedSeals = variant === 'explore' ? unlockedSealCount : roundIndex;

  return (
    <div className={`memory-explore-game ${variant === 'battle' ? 'memory-battle-game' : 'memory-village-game'} feedback-${feedback} completion-${completionPhase} ${paused ? 'is-paused' : ''}`}>
      <div className={`memory-explore-npc-scene ${variant === 'explore' ? 'memory-explore-village-scene' : ''}`}>
        {variant === 'explore' && (
          <>
            <img
              className="memory-explore-village-art"
              src={CAMPAIGN_IMAGES.levelThreeVillage}
              alt=""
              aria-hidden="true"
              draggable="false"
            />
            <div className="memory-explore-village-haze" aria-hidden="true" />
            <div className="memory-explore-xia" role="img" aria-label={completionPhase === 'smile-hold' ? '恢復笑容的小亞' : '神情憂愁的小亞'}>
              <img
                className="memory-explore-xia-art memory-explore-xia-worried"
                src={CAMPAIGN_IMAGES.levelThreeXiaWorried}
                alt=""
                aria-hidden="true"
                draggable="false"
              />
              <img
                className="memory-explore-xia-art memory-explore-xia-smile"
                src={CAMPAIGN_IMAGES.levelThreeXiaSmile}
                alt=""
                aria-hidden="true"
                draggable="false"
              />
            </div>
          </>
        )}
        {variant === 'battle' && <div className="memory-battle-barrier" aria-label="巨大迷霧結界">巨大迷霧結界</div>}
        <div className="memory-explore-seals" aria-label={`尚餘 ${MEMORY_GROUP_COUNT - displayedUnlockedSeals} ${variant === 'battle' ? '層結界護盾' : '道迷霧封印'}`}>
          {Array.from({ length: MEMORY_GROUP_COUNT }, (_, index) => (
            <img
              key={index}
              src={index < displayedUnlockedSeals ? CAMPAIGN_IMAGES.sealUnlocked : CAMPAIGN_IMAGES.sealLocked}
              alt=""
              aria-hidden="true"
            />
          ))}
        </div>
        {variant === 'battle' && <div className="memory-explore-npc" aria-label="聲音典籍魔法師">小亞</div>}
      </div>

      <CampaignAudioReplayButton
        onReplay={replayTarget}
        onStop={stopTarget}
        paused={paused}
        disabled={phase !== 'prompt'}
        autoPlayKey={phase === 'prompt' ? `${plan.id}:round-${roundIndex + 1}` : undefined}
        label="重播目標讀音"
        onPlaybackChange={setAudioPlaying}
      />

      <section className="memory-explore-grid" aria-label="注音符文卡片區">
        {layout.map((card, position) => {
          const faceUp = cardsFaceUp || selectedCardIds.includes(card.id);
          return (
            <button
              type="button"
              key={card.id}
              className={`memory-explore-card memory-symbol-color-${symbolColorIndexes.get(card.symbol) ?? 0} ${faceUp ? 'face-up' : 'face-down'}`}
              disabled={controlsDisabled}
              onClick={() => selectCard(card.id)}
              aria-label={faceUp ? `符文 ${card.symbol}` : `第 ${position + 1} 張蓋住的符文卡`}
            >
              <img
                className="memory-explore-card-art"
                src={faceUp ? CAMPAIGN_IMAGES.runeCardFront : CAMPAIGN_IMAGES.runeCardBack}
                alt=""
                aria-hidden="true"
                draggable="false"
              />
              {faceUp && <span className="memory-explore-card-symbol" aria-hidden="true">{card.symbol}</span>}
            </button>
          );
        })}
      </section>

      <p className={`memory-explore-feedback memory-instruction memory-instruction-${phase}`} aria-live="polite">
        {feedback === 'attack' ? `結界釋放黑霧攻擊，剩餘 ${lives} 點生命。` :
          phase === 'memorize'
            ? '仔細記住九張符文的位置'
            : '找出兩張與目標讀音相同的符文卡'}
      </p>
    </div>
  );
}
