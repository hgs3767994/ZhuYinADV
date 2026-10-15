import { describe, expect, it } from 'vitest';
import {
  createLevelFourEscort,
  createLevelSixChase,
  initialPursuitState,
  LEVEL_FOUR_SYMBOLS,
  LEVEL_SIX_SYMBOLS,
  pursuitStars,
  resolvePursuitSegment
} from './pursuit';
import type { RandomSource } from './sequenceLock';

class FixedRandom implements RandomSource {
  constructor(private readonly values: readonly number[]) {}
  private index = 0;
  next(): number {
    const value = this.values[this.index % this.values.length] ?? 0;
    this.index += 1;
    return value;
  }
}

describe('pursuit and escort gameplay', () => {
  it('creates ten stable beginner segments and uses every level-four symbol once', () => {
    const segments = createLevelFourEscort('escort-run', new FixedRandom([0.15, 0.82, 0.44]));
    expect(segments).toHaveLength(10);
    expect([...segments.map((segment) => segment.targetSymbol)].sort()).toEqual([...LEVEL_FOUR_SYMBOLS].sort());
    expect(new Set(segments.map((segment) => segment.id)).size).toBe(10);
    for (const segment of segments) {
      expect(segment.id).toMatch(/^escort-run:escort:segment-/);
      expect(segment.roads).toHaveLength(2);
      expect(segment.roads.filter((road) => road.correct)).toHaveLength(1);
      expect(new Set(segment.roads.map((road) => road.symbol)).size).toBe(2);
      expect(segment.roads.every((road) => road.id.startsWith(segment.id))).toBe(true);
    }
  });

  it('never pairs the two newly introduced finals with each other', () => {
    const segments = createLevelFourEscort('new-symbol-run', new FixedRandom([0]));
    for (const target of ['ㄢ', 'ㄣ']) {
      const segment = segments.find((item) => item.targetSymbol === target)!;
      expect(segment.roads.map((road) => road.symbol)).not.toContain(target === 'ㄢ' ? 'ㄣ' : 'ㄢ');
    }
  });

  it('creates ten stable chase segments from the eleven-symbol pool with three roads each', () => {
    const segments = createLevelSixChase('chase-run', new FixedRandom([0.15, 0.82, 0.44, 0.63]));
    expect(segments).toHaveLength(10);
    expect(new Set(segments.map((segment) => segment.targetSymbol)).size).toBe(10);
    expect(segments.every((segment) => LEVEL_SIX_SYMBOLS.includes(segment.targetSymbol as typeof LEVEL_SIX_SYMBOLS[number]))).toBe(true);
    expect(new Set(segments.map((segment) => segment.id)).size).toBe(10);
    for (const segment of segments) {
      expect(segment.id).toMatch(/^chase-run:chase:segment-/);
      expect(segment.roads).toHaveLength(3);
      expect(segment.roads.filter((road) => road.correct)).toHaveLength(1);
      expect(new Set(segment.roads.map((road) => road.symbol)).size).toBe(3);
      expect(segment.roads.every((road) => LEVEL_SIX_SYMBOLS.includes(road.symbol as typeof LEVEL_SIX_SYMBOLS[number]))).toBe(true);
      expect(segment.roads.every((road) => road.id.startsWith(segment.id))).toBe(true);
    }
  });

  it('mixes a limited number of confusable roads into level six', () => {
    const segments = createLevelSixChase('mixed-run', new FixedRandom([0.21, 0.74, 0.39]));
    const confusablePairs = new Set(['ㄧㄩ', 'ㄨㄩ', 'ㄩㄨ', 'ㄚㄞ', 'ㄛㄠ', 'ㄞㄟ', 'ㄟㄞ', 'ㄠㄛ', 'ㄢㄣ', 'ㄣㄢ', 'ㄦㄛ']);
    const mixedSegments = segments.filter((segment) =>
      segment.roads.some((road) => !road.correct && confusablePairs.has(`${segment.targetSymbol}${road.symbol}`))
    );
    expect(mixedSegments).toHaveLength(3);
  });

  it('applies distance, streak and wind boost rules without exceeding five spaces', () => {
    let state = initialPursuitState();
    expect(state.safetyDistance).toBe(2);
    state = resolvePursuitSegment(state, true);
    expect(state).toMatchObject({ safetyDistance: 3, successStreak: 1, maxSuccessStreak: 1, windBoost: false });
    state = resolvePursuitSegment(state, true);
    expect(state).toMatchObject({ safetyDistance: 4, successStreak: 2, windBoost: false });
    state = resolvePursuitSegment(state, true);
    expect(state).toMatchObject({ safetyDistance: 5, successStreak: 3, maxSuccessStreak: 3, windBoost: true });
    state = resolvePursuitSegment(state, false);
    expect(state).toMatchObject({ safetyDistance: 4, successStreak: 0, maxSuccessStreak: 3, windBoost: false });
  });

  it('reaches immediate defeat at zero and uses the confirmed star thresholds', () => {
    let state = initialPursuitState();
    state = resolvePursuitSegment(state, false);
    state = resolvePursuitSegment(state, false);
    expect(state.safetyDistance).toBe(0);
    expect(pursuitStars(5)).toBe(3);
    expect(pursuitStars(4)).toBe(2);
    expect(pursuitStars(3)).toBe(2);
    expect(pursuitStars(2)).toBe(1);
    expect(pursuitStars(1)).toBe(1);
  });
});
