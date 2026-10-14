import { describe, expect, it } from 'vitest';
import {
  createLevelEightSequenceLockPuzzles,
  createSequenceLockPuzzles,
  emptySequenceLockSlots,
  placeSequenceLockCard,
  returnSequenceLockCard,
  LEVEL_EIGHT_OLD_SYMBOLS,
  sequenceLockMatches,
  sequenceLockReady,
  sequenceLockStars,
  type RandomSource
} from './sequenceLock';

class FixedRandom implements RandomSource {
  constructor(private readonly values: number[]) {}
  private index = 0;
  next(): number {
    const value = this.values[this.index % this.values.length] ?? 0;
    this.index += 1;
    return value;
  }
}

describe('sequence lock gameplay', () => {
  it('creates stable 3, 4, 4 locks with unique cards and a spoken order unlike display order', () => {
    const puzzles = createSequenceLockPuzzles('result-1', new FixedRandom([0]));
    expect(puzzles.map((puzzle) => puzzle.cards.length)).toEqual([3, 4, 4]);
    expect(new Set(puzzles.map((puzzle) => [...puzzle.cards].map((card) => card.symbol).sort().join(''))).size)
      .toBe(3);
    for (const puzzle of puzzles) {
      expect(new Set(puzzle.cards.map((card) => card.symbol)).size).toBe(puzzle.cards.length);
      expect(puzzle.targetSymbols).not.toEqual(puzzle.cards.map((card) => card.symbol));
      expect([...puzzle.targetSymbols].sort()).toEqual(puzzle.cards.map((card) => card.symbol).sort());
      expect(puzzle.cards.every((card) => card.id.startsWith(puzzle.id))).toBe(true);
    }
  });

  it('fills the leftmost empty lock slot and preserves holes when a card returns', () => {
    let slots = emptySequenceLockSlots(4);
    slots = placeSequenceLockCard(slots, 'a');
    slots = placeSequenceLockCard(slots, 'b');
    slots = placeSequenceLockCard(slots, 'c');
    slots = returnSequenceLockCard(slots, 1);
    expect(slots).toEqual(['a', null, 'c', null]);
    slots = placeSequenceLockCard(slots, 'd');
    expect(slots).toEqual(['a', 'd', 'c', null]);
  });

  it('judges only a complete sequence and matches card symbols to the target', () => {
    const puzzle = createSequenceLockPuzzles('result-2', new FixedRandom([0.2, 0.8, 0.4]))[0];
    const orderedIds = puzzle.targetSymbols.map((symbol) =>
      puzzle.cards.find((card) => card.symbol === symbol)!.id
    );
    expect(sequenceLockReady([...orderedIds.slice(0, -1), null])).toBe(false);
    expect(sequenceLockMatches(puzzle, [...orderedIds.slice(0, -1), null])).toBe(false);
    expect(sequenceLockMatches(puzzle, orderedIds)).toBe(true);
  });

  it('uses the confirmed star thresholds', () => {
    expect(sequenceLockStars(0)).toBe(3);
    expect(sequenceLockStars(1)).toBe(3);
    expect(sequenceLockStars(2)).toBe(2);
    expect(sequenceLockStars(3)).toBe(2);
    expect(sequenceLockStars(4)).toBe(1);
    expect(sequenceLockStars(20)).toBe(1);
  });

  it('creates the confirmed level-eight symbol distribution without repeating old symbols', () => {
    const puzzles = createLevelEightSequenceLockPuzzles('magic-door-run', new FixedRandom([0.12, 0.87, 0.36, 0.64]));
    expect(puzzles.map((puzzle) => puzzle.cards.length)).toEqual([3, 4, 4]);
    const symbols = puzzles.map((puzzle) => puzzle.cards.map((card) => card.symbol));
    expect(symbols[0].filter((symbol) => symbol === 'ㄍ')).toHaveLength(1);
    expect(symbols[0].filter((symbol) => symbol === 'ㄐ')).toHaveLength(1);
    expect(symbols[1]).toEqual(expect.arrayContaining(['ㄍ', 'ㄅ', 'ㄉ']));
    expect(symbols[2].filter((symbol) => symbol === 'ㄐ')).toHaveLength(1);
    expect(symbols.flat().filter((symbol) => symbol === 'ㄍ')).toHaveLength(2);
    expect(symbols.flat().filter((symbol) => symbol === 'ㄐ')).toHaveLength(2);
    expect(symbols.flat().filter((symbol) => symbol === 'ㄅ')).toHaveLength(1);
    expect(symbols.flat().filter((symbol) => symbol === 'ㄉ')).toHaveLength(1);
    const oldSymbols = symbols.flat().filter((symbol) =>
      LEVEL_EIGHT_OLD_SYMBOLS.includes(symbol as typeof LEVEL_EIGHT_OLD_SYMBOLS[number])
    );
    expect(oldSymbols).toHaveLength(5);
    expect(new Set(oldSymbols).size).toBe(5);
    for (const puzzle of puzzles) {
      expect(new Set(puzzle.cards.map((card) => card.symbol)).size).toBe(puzzle.cards.length);
      expect(puzzle.targetSymbols).not.toEqual(puzzle.cards.map((card) => card.symbol));
      expect([...puzzle.targetSymbols].sort()).toEqual(puzzle.cards.map((card) => card.symbol).sort());
      expect(puzzle.id).toMatch(/^magic-door-run:magic-door-lock-/);
      expect(puzzle.cards.every((card) => card.id.startsWith(puzzle.id))).toBe(true);
    }
  });
});
