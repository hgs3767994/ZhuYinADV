import type { CampaignStars } from './campaignTypes';
import type { RandomSource } from './sequenceLock';

export const MEMORY_SYMBOL_POOL = ['ㄞ', 'ㄟ', 'ㄠ', 'ㄧ', 'ㄨ', 'ㄩ', 'ㄚ', 'ㄛ'] as const;
export const MEMORY_GROUP_COUNT = 5;
export const MEMORY_ACTIVE_GROUP_COUNT = 3;
export const MEMORY_CARDS_PER_GROUP = 3;
export const MEMORY_BOARD_SIZE = MEMORY_ACTIVE_GROUP_COUNT * MEMORY_CARDS_PER_GROUP;

export interface MemoryExploreCard {
  id: string;
  symbol: string;
}

export interface MemoryExplorePlan {
  id: string;
  cards: readonly MemoryExploreCard[];
  targetSymbols: readonly string[];
  replacementSymbols: readonly string[];
  presentedSymbols: readonly string[];
}

export type MemoryExploreLayout = readonly MemoryExploreCard[];

const browserRandom: RandomSource = { next: () => Math.random() };

function shuffled<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.min(index, Math.floor(random.next() * (index + 1)));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function rotate<T>(items: readonly T[]): T[] {
  return items.length < 2 ? [...items] : [...items.slice(1), items[0]];
}

function cardsForSymbol(planId: string, symbol: string, appearanceIndex: number): MemoryExploreCard[] {
  return Array.from({ length: MEMORY_CARDS_PER_GROUP }, (_, copyIndex) => ({
    id: `${planId}:group-${String(appearanceIndex + 1).padStart(2, '0')}:copy-${copyIndex + 1}`,
    symbol
  }));
}

function createMemoryPlan(
  runId: string,
  idPrefix: 'memory' | 'memory-battle',
  random: RandomSource
): MemoryExplorePlan {
  const id = `${runId}:${idPrefix}`;
  const symbolOrder = shuffled(MEMORY_SYMBOL_POOL, random);
  const initialSymbols = symbolOrder.slice(0, MEMORY_ACTIVE_GROUP_COUNT);
  const replacementSymbols = symbolOrder.slice(
    MEMORY_ACTIVE_GROUP_COUNT,
    MEMORY_ACTIVE_GROUP_COUNT + MEMORY_GROUP_COUNT - 1
  );
  const activeSymbols = [...initialSymbols];
  const targetSymbols: string[] = [];

  for (let roundIndex = 0; roundIndex < MEMORY_GROUP_COUNT; roundIndex += 1) {
    const targetIndex = Math.min(
      activeSymbols.length - 1,
      Math.floor(random.next() * activeSymbols.length)
    );
    targetSymbols.push(activeSymbols[targetIndex]);
    activeSymbols.splice(targetIndex, 1);
    if (roundIndex < replacementSymbols.length) {
      activeSymbols.push(replacementSymbols[roundIndex]);
    }
  }

  const cards = initialSymbols.flatMap((symbol, symbolIndex) =>
    cardsForSymbol(id, symbol, symbolIndex)
  );

  return {
    id,
    cards: shuffled(cards, random),
    targetSymbols,
    replacementSymbols,
    presentedSymbols: [...initialSymbols, ...replacementSymbols]
  };
}

export function createMemoryExplorePlan(
  runId: string,
  random: RandomSource = browserRandom
): MemoryExplorePlan {
  return createMemoryPlan(runId, 'memory', random);
}

export function createMemoryBattlePlan(
  runId: string,
  random: RandomSource = browserRandom
): MemoryExplorePlan {
  return createMemoryPlan(runId, 'memory-battle', random);
}

export function memoryExplorePairMatches(
  layout: MemoryExploreLayout,
  selectedCardIds: readonly string[],
  targetSymbol: string
): boolean {
  if (selectedCardIds.length !== 2 || selectedCardIds[0] === selectedCardIds[1]) return false;
  const selected = selectedCardIds.map((id) => layout.find((card) => card.id === id));
  return selected.every((card) => card?.symbol === targetSymbol);
}

export function replaceAndReshuffleMemoryGroup(
  layout: MemoryExploreLayout,
  completedSymbol: string,
  replacementSymbol: string,
  planId: string,
  replacementIndex: number,
  random: RandomSource = browserRandom
): MemoryExploreLayout {
  const remainingCards = layout.filter((card) => card.symbol !== completedSymbol);
  const replacementCards = cardsForSymbol(
    planId,
    replacementSymbol,
    MEMORY_ACTIVE_GROUP_COUNT + replacementIndex
  );
  const unshuffledCards = [...remainingCards, ...replacementCards];
  let next = shuffled(unshuffledCards, random);
  const orderUnchanged = layout.every((card, index) => card.id === next[index]?.id);
  if (next.length > 1 && orderUnchanged) next = rotate(next);
  return next;
}

export function createMemoryColorAssignments(
  layout: MemoryExploreLayout,
  previous?: ReadonlyMap<string, number>,
  random: RandomSource = browserRandom
): ReadonlyMap<string, number> {
  const symbols = [...new Set(layout.map((card) => card.symbol))];
  const colors = shuffled([0, 1, 2], random);
  const assignments = new Map(symbols.map((symbol, index) => [symbol, colors[index]]));
  const survivingSymbols = previous ? symbols.filter((symbol) => previous.has(symbol)) : [];
  if (previous && survivingSymbols.length > 0 && survivingSymbols.every(
    (symbol) => previous.get(symbol) === assignments.get(symbol)
  )) {
    const survivor = survivingSymbols[0];
    const swapWith = symbols.find((symbol) => symbol !== survivor);
    if (swapWith) {
      const survivorColor = assignments.get(survivor)!;
      assignments.set(survivor, assignments.get(swapWith)!);
      assignments.set(swapWith, survivorColor);
    }
  }
  return assignments;
}

export function memoryExploreStars(wrongPairCount: number): CampaignStars {
  if (wrongPairCount <= 2) return 3;
  if (wrongPairCount <= 5) return 2;
  return 1;
}

export function memoryBattleStars(remainingLives: number): CampaignStars {
  if (remainingLives >= 4) return 3;
  if (remainingLives >= 2) return 2;
  return 1;
}

export function memoryBattleLivesAfterMistake(remainingLives: number): number {
  return Math.max(0, remainingLives - 1);
}
