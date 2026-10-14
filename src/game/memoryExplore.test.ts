import { describe, expect, it } from 'vitest';
import {
  createMemoryBattlePlan,
  createMemoryColorAssignments,
  createMemoryExplorePlan,
  MEMORY_ACTIVE_GROUP_COUNT,
  MEMORY_BOARD_SIZE,
  MEMORY_CARDS_PER_GROUP,
  MEMORY_GROUP_COUNT,
  MEMORY_SYMBOL_POOL,
  memoryExplorePairMatches,
  memoryBattleLivesAfterMistake,
  memoryBattleStars,
  memoryExploreStars,
  replaceAndReshuffleMemoryGroup
} from './memoryExplore';
import type { RandomSource } from './sequenceLock';

class FixedRandom implements RandomSource {
  constructor(private readonly value: number) {}
  next(): number { return this.value; }
}

function expectConfirmedBoard(plan: ReturnType<typeof createMemoryExplorePlan>, prefix: string) {
  expect(plan.cards).toHaveLength(MEMORY_BOARD_SIZE);
  expect(new Set(plan.cards.map((card) => card.id)).size).toBe(MEMORY_BOARD_SIZE);
  expect(plan.cards.every((card) => card.id.startsWith(prefix))).toBe(true);
  expect(new Set(plan.cards.map((card) => card.symbol)).size).toBe(MEMORY_ACTIVE_GROUP_COUNT);
  for (const symbol of new Set(plan.cards.map((card) => card.symbol))) {
    expect(plan.cards.filter((card) => card.symbol === symbol)).toHaveLength(MEMORY_CARDS_PER_GROUP);
  }
  expect(plan.targetSymbols).toHaveLength(MEMORY_GROUP_COUNT);
  expect(new Set(plan.targetSymbols).size).toBe(MEMORY_GROUP_COUNT);
  expect(plan.replacementSymbols).toHaveLength(MEMORY_GROUP_COUNT - 1);
  expect(plan.presentedSymbols).toHaveLength(7);
  expect(new Set(plan.presentedSymbols).size).toBe(7);
  expect(plan.presentedSymbols.every((symbol) => MEMORY_SYMBOL_POOL.includes(symbol as typeof MEMORY_SYMBOL_POOL[number]))).toBe(true);
}

describe('memory explore gameplay', () => {
  it('creates a three-by-three board with three triples and five unique targets', () => {
    const plan = createMemoryExplorePlan('memory-run', new FixedRandom(0.37));
    expectConfirmedBoard(plan, 'memory-run:memory:');
  });

  it('accepts only two different cards that both match the current target', () => {
    const plan = createMemoryExplorePlan('matching-run', new FixedRandom(0));
    const target = plan.targetSymbols[0];
    const matching = plan.cards.filter((card) => card.symbol === target).map((card) => card.id);
    const wrong = plan.cards.find((card) => card.symbol !== target)!.id;
    expect(memoryExplorePairMatches(plan.cards, matching.slice(0, 2), target)).toBe(true);
    expect(memoryExplorePairMatches(plan.cards, [matching[0], wrong], target)).toBe(false);
    expect(memoryExplorePairMatches(plan.cards, [matching[0], matching[0]], target)).toBe(false);
  });

  it('replaces the completed triple with an unseen triple and reshuffles all nine cards', () => {
    const plan = createMemoryExplorePlan('refill-run', new FixedRandom(0.999999));
    const target = plan.targetSymbols[0];
    const replacement = plan.replacementSymbols[0];
    const next = replaceAndReshuffleMemoryGroup(
      plan.cards,
      target,
      replacement,
      plan.id,
      0,
      new FixedRandom(0.999999)
    );
    expect(next).toHaveLength(MEMORY_BOARD_SIZE);
    expect(next.filter((card) => card.symbol === target)).toHaveLength(0);
    expect(next.filter((card) => card.symbol === replacement)).toHaveLength(MEMORY_CARDS_PER_GROUP);
    expect(new Set(next.map((card) => card.symbol)).size).toBe(MEMORY_ACTIVE_GROUP_COUNT);
    expect(new Set(next.map((card) => card.id)).size).toBe(MEMORY_BOARD_SIZE);
    expect(next.some((card, index) => card.id !== plan.cards[index].id)).toBe(true);
  });

  it('assigns one distinct color to each triple and changes a surviving assignment next round', () => {
    const plan = createMemoryExplorePlan('color-run', new FixedRandom(0.5));
    const first = createMemoryColorAssignments(plan.cards, undefined, new FixedRandom(0.999999));
    const nextLayout = replaceAndReshuffleMemoryGroup(
      plan.cards,
      plan.targetSymbols[0],
      plan.replacementSymbols[0],
      plan.id,
      0,
      new FixedRandom(0.5)
    );
    const second = createMemoryColorAssignments(nextLayout, first, new FixedRandom(0.999999));
    expect(new Set(first.values())).toEqual(new Set([0, 1, 2]));
    expect(new Set(second.values())).toEqual(new Set([0, 1, 2]));
    const survivors = [...second.keys()].filter((symbol) => first.has(symbol));
    expect(survivors.some((symbol) => first.get(symbol) !== second.get(symbol))).toBe(true);
  });

  it('uses the confirmed exploration star thresholds', () => {
    expect(memoryExploreStars(0)).toBe(3);
    expect(memoryExploreStars(2)).toBe(3);
    expect(memoryExploreStars(3)).toBe(2);
    expect(memoryExploreStars(5)).toBe(2);
    expect(memoryExploreStars(6)).toBe(1);
  });

  it('uses the same confirmed five-group plan for memory battle', () => {
    const plan = createMemoryBattlePlan('memory-battle-run', new FixedRandom(0.42));
    expectConfirmedBoard(plan, 'memory-battle-run:memory-battle:');
  });

  it('uses remaining lives for the confirmed memory battle stars', () => {
    expect(memoryBattleStars(5)).toBe(3);
    expect(memoryBattleStars(4)).toBe(3);
    expect(memoryBattleStars(3)).toBe(2);
    expect(memoryBattleStars(2)).toBe(2);
    expect(memoryBattleStars(1)).toBe(1);
    expect(memoryBattleLivesAfterMistake(5)).toBe(4);
    expect(memoryBattleLivesAfterMistake(1)).toBe(0);
    expect(memoryBattleLivesAfterMistake(0)).toBe(0);
  });
});
