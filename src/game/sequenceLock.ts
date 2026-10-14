import type { CampaignStars } from './campaignTypes';

export const LEVEL_ONE_SYMBOLS = ['ㄧ', 'ㄨ', 'ㄩ', 'ㄚ', 'ㄛ'] as const;
export const LEVEL_EIGHT_OLD_SYMBOLS = ['ㄧ', 'ㄨ', 'ㄩ', 'ㄚ', 'ㄛ', 'ㄞ', 'ㄟ', 'ㄠ', 'ㄢ', 'ㄣ', 'ㄦ'] as const;
export const LEVEL_EIGHT_SYMBOLS = [...LEVEL_EIGHT_OLD_SYMBOLS, 'ㄅ', 'ㄉ', 'ㄍ', 'ㄐ'] as const;
export const SEQUENCE_LOCK_SIZES = [3, 4, 4] as const;

export interface SequenceLockCard {
  id: string;
  symbol: string;
  waitingIndex: number;
}

export interface SequenceLockPuzzle {
  id: string;
  cards: readonly SequenceLockCard[];
  targetSymbols: readonly string[];
}

export type SequenceLockSlots = readonly (string | null)[];

export interface RandomSource {
  next(): number;
}

const browserRandom: RandomSource = { next: () => Math.random() };

function shuffled<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random.next() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function sameOrder(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function setKey(symbols: readonly string[]): string {
  return [...symbols].sort().join('|');
}

function rotate<T>(items: readonly T[]): T[] {
  return items.length < 2 ? [...items] : [...items.slice(1), items[0]];
}

export function createSequenceLockPuzzles(
  runId: string,
  random: RandomSource = browserRandom
): readonly SequenceLockPuzzle[] {
  const usedSets = new Set<string>();
  return SEQUENCE_LOCK_SIZES.map((size, lockIndex) => {
    let symbols = shuffled(LEVEL_ONE_SYMBOLS, random).slice(0, size);
    let key = setKey(symbols);
    if (usedSets.has(key)) {
      const unused = LEVEL_ONE_SYMBOLS.find((symbol) => !symbols.includes(symbol));
      if (unused) symbols = [...symbols.slice(0, -1), unused];
      key = setKey(symbols);
    }
    usedSets.add(key);

    const displaySymbols = shuffled(symbols, random);
    let targetSymbols = shuffled(displaySymbols, random);
    if (sameOrder(displaySymbols, targetSymbols)) targetSymbols = rotate(targetSymbols);
    const lockNumber = String(lockIndex + 1).padStart(2, '0');
    return {
      id: `${runId}:lock-${lockNumber}`,
      cards: displaySymbols.map((symbol, waitingIndex) => ({
        id: `${runId}:lock-${lockNumber}:card-${String(waitingIndex + 1).padStart(2, '0')}`,
        symbol,
        waitingIndex
      })),
      targetSymbols
    };
  });
}

function createPuzzle(
  runId: string,
  namespace: string,
  lockIndex: number,
  symbols: readonly string[],
  random: RandomSource
): SequenceLockPuzzle {
  const displaySymbols = shuffled(symbols, random);
  let targetSymbols = shuffled(displaySymbols, random);
  if (sameOrder(displaySymbols, targetSymbols)) targetSymbols = rotate(targetSymbols);
  const lockNumber = String(lockIndex + 1).padStart(2, '0');
  const puzzleId = `${runId}:${namespace}-${lockNumber}`;
  return {
    id: puzzleId,
    cards: displaySymbols.map((symbol, waitingIndex) => ({
      id: `${puzzleId}:card-${String(waitingIndex + 1).padStart(2, '0')}`,
      symbol,
      waitingIndex
    })),
    targetSymbols
  };
}

export function createLevelEightSequenceLockPuzzles(
  runId: string,
  random: RandomSource = browserRandom
): readonly SequenceLockPuzzle[] {
  const oldSymbols = shuffled(LEVEL_EIGHT_OLD_SYMBOLS, random).slice(0, 5);
  const lockSymbols: readonly (readonly string[])[] = [
    ['ㄍ', 'ㄐ', oldSymbols[0]],
    ['ㄍ', 'ㄅ', 'ㄉ', oldSymbols[1]],
    ['ㄐ', ...oldSymbols.slice(2, 5)]
  ];
  return lockSymbols.map((symbols, lockIndex) =>
    createPuzzle(runId, 'magic-door-lock', lockIndex, symbols, random)
  );
}

export function emptySequenceLockSlots(size: number): SequenceLockSlots {
  return Array.from({ length: size }, () => null);
}

export function placeSequenceLockCard(
  slots: SequenceLockSlots,
  cardId: string
): SequenceLockSlots {
  if (slots.includes(cardId)) return slots;
  const emptyIndex = slots.indexOf(null);
  if (emptyIndex < 0) return slots;
  return slots.map((value, index) => index === emptyIndex ? cardId : value);
}

export function returnSequenceLockCard(
  slots: SequenceLockSlots,
  slotIndex: number
): SequenceLockSlots {
  if (slotIndex < 0 || slotIndex >= slots.length || slots[slotIndex] === null) return slots;
  return slots.map((value, index) => index === slotIndex ? null : value);
}

export function sequenceLockReady(slots: SequenceLockSlots): boolean {
  return slots.length > 0 && slots.every((cardId) => cardId !== null);
}

export function sequenceLockMatches(
  puzzle: SequenceLockPuzzle,
  slots: SequenceLockSlots
): boolean {
  if (!sequenceLockReady(slots)) return false;
  const symbols = slots.map((cardId) =>
    puzzle.cards.find((card) => card.id === cardId)?.symbol
  );
  return symbols.every((symbol, index) => symbol === puzzle.targetSymbols[index]);
}

export function sequenceLockStars(wrongSequenceCount: number): CampaignStars {
  if (wrongSequenceCount <= 1) return 3;
  if (wrongSequenceCount <= 3) return 2;
  return 1;
}
