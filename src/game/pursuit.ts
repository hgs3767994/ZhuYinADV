import type { CampaignStars } from './campaignTypes';
import type { RandomSource } from './sequenceLock';

export const LEVEL_FOUR_SYMBOLS = ['ㄧ', 'ㄨ', 'ㄩ', 'ㄚ', 'ㄛ', 'ㄞ', 'ㄟ', 'ㄠ', 'ㄢ', 'ㄣ'] as const;
export const LEVEL_SIX_SYMBOLS = [...LEVEL_FOUR_SYMBOLS, 'ㄦ'] as const;
export const PURSUIT_SEGMENT_COUNT = 10;
export const PURSUIT_INITIAL_SAFETY = 2;
export const PURSUIT_MAX_SAFETY = 5;

export interface PursuitRoad {
  id: string;
  symbol: string;
  correct: boolean;
}

export interface PursuitSegment {
  id: string;
  targetSymbol: string;
  roads: readonly PursuitRoad[];
}

export interface PursuitState {
  safetyDistance: number;
  successStreak: number;
  maxSuccessStreak: number;
}

export interface PursuitResolution extends PursuitState {
  windBoost: boolean;
}

const browserRandom: RandomSource = { next: () => Math.random() };

const BEGINNER_DISTRACTORS: Record<string, string> = {
  ㄧ: 'ㄚ',
  ㄨ: 'ㄟ',
  ㄩ: 'ㄠ',
  ㄚ: 'ㄨ',
  ㄛ: 'ㄧ',
  ㄞ: 'ㄩ',
  ㄟ: 'ㄚ',
  ㄠ: 'ㄨ',
  ㄢ: 'ㄧ',
  ㄣ: 'ㄛ'
};

const LEVEL_SIX_CONFUSABLE: Record<string, string> = {
  ㄧ: 'ㄩ',
  ㄨ: 'ㄩ',
  ㄩ: 'ㄨ',
  ㄚ: 'ㄞ',
  ㄛ: 'ㄠ',
  ㄞ: 'ㄟ',
  ㄟ: 'ㄞ',
  ㄠ: 'ㄛ',
  ㄢ: 'ㄣ',
  ㄣ: 'ㄢ',
  ㄦ: 'ㄛ'
};

function shuffled<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random.next() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function createLevelFourEscort(
  runId: string,
  random: RandomSource = browserRandom
): readonly PursuitSegment[] {
  return shuffled(LEVEL_FOUR_SYMBOLS, random).map((targetSymbol, index) => {
    const segmentNumber = String(index + 1).padStart(2, '0');
    const segmentId = `${runId}:escort:segment-${segmentNumber}`;
    const optionSymbols = shuffled(
      [targetSymbol, BEGINNER_DISTRACTORS[targetSymbol]],
      random
    );
    return {
      id: segmentId,
      targetSymbol,
      roads: optionSymbols.map((symbol, roadIndex) => ({
        id: `${segmentId}:road-${roadIndex + 1}`,
        symbol,
        correct: symbol === targetSymbol
      }))
    };
  });
}

export function createLevelSixChase(
  runId: string,
  random: RandomSource = browserRandom
): readonly PursuitSegment[] {
  const targets = shuffled(LEVEL_SIX_SYMBOLS, random).slice(0, PURSUIT_SEGMENT_COUNT);
  return targets.map((targetSymbol, index) => {
    const segmentNumber = String(index + 1).padStart(2, '0');
    const segmentId = `${runId}:chase:segment-${segmentNumber}`;
    const confusable = LEVEL_SIX_CONFUSABLE[targetSymbol];
    const usesConfusable = (index + 1) % 3 === 0;
    const broadPool = shuffled(
      LEVEL_SIX_SYMBOLS.filter((symbol) => symbol !== targetSymbol && symbol !== confusable),
      random
    );
    const distractors = usesConfusable
      ? [confusable, broadPool[0]]
      : broadPool.slice(0, 2);
    const optionSymbols = shuffled([targetSymbol, ...distractors], random);
    return {
      id: segmentId,
      targetSymbol,
      roads: optionSymbols.map((symbol, roadIndex) => ({
        id: `${segmentId}:road-${roadIndex + 1}`,
        symbol,
        correct: symbol === targetSymbol
      }))
    };
  });
}

export function initialPursuitState(): PursuitState {
  return {
    safetyDistance: PURSUIT_INITIAL_SAFETY,
    successStreak: 0,
    maxSuccessStreak: 0
  };
}

export function resolvePursuitSegment(
  state: PursuitState,
  correct: boolean
): PursuitResolution {
  if (!correct) {
    return {
      safetyDistance: Math.max(0, state.safetyDistance - 1),
      successStreak: 0,
      maxSuccessStreak: state.maxSuccessStreak,
      windBoost: false
    };
  }

  const successStreak = state.successStreak + 1;
  const windBoost = successStreak % 3 === 0;
  return {
    safetyDistance: Math.min(
      PURSUIT_MAX_SAFETY,
      state.safetyDistance + 1 + (windBoost ? 1 : 0)
    ),
    successStreak,
    maxSuccessStreak: Math.max(state.maxSuccessStreak, successStreak),
    windBoost
  };
}

export function pursuitStars(finalSafetyDistance: number): CampaignStars {
  if (finalSafetyDistance >= 5) return 3;
  if (finalSafetyDistance >= 3) return 2;
  return 1;
}
