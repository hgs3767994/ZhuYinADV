import { describe, expect, it } from 'vitest';
import {
  BOSS_WAVE_KINDS,
  battleStars,
  createBossBattle,
  createLevelFiveBattle,
  createLevelNineBattle,
  LEVEL_FIVE_BATTLE_SYMBOLS,
  LEVEL_NINE_WAVE_KINDS,
  normalBattleAttack,
  piercingBattleAttack,
  resolveEnemyAttack
} from './battle';
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

describe('zhuyin battle gameplay', () => {
  it('creates the confirmed beginner waves with stable two-life normal enemies', () => {
    const plan = createLevelFiveBattle('battle-run', new FixedRandom([0.2, 0.8]));
    expect(plan.waves.map((wave) => wave.length)).toEqual([1, 1, 2, 1, 2]);
    expect(plan.waves.flat()).toHaveLength(7);
    expect(plan.waves.flat().every((enemy) => enemy.kind === 'normal' && enemy.life === 2 && enemy.shield === 0)).toBe(true);
    expect(new Set(plan.waves.flat().map((enemy) => enemy.id)).size).toBe(7);
  });

  it('uses ㄦ first, exhausts the other ten before a new cycle and stays within the level pool', () => {
    const plan = createLevelFiveBattle('question-run', new FixedRandom([0.13, 0.77, 0.41]), 14);
    const firstCycle = plan.questions.slice(0, 11).map((question) => question.answer);
    expect(firstCycle[0]).toBe('ㄦ');
    expect(new Set(firstCycle).size).toBe(11);
    expect([...firstCycle].sort()).toEqual([...LEVEL_FIVE_BATTLE_SYMBOLS].sort());
    for (const question of plan.questions) {
      expect(question.options).toHaveLength(2);
      expect(question.options.filter((option) => option.correct)).toHaveLength(1);
      expect(new Set(question.options.map((option) => option.symbol)).size).toBe(2);
      expect(question.options.every((option) => LEVEL_FIVE_BATTLE_SYMBOLS.includes(option.symbol as typeof LEVEL_FIVE_BATTLE_SYMBOLS[number]))).toBe(true);
    }
  });

  it('prevents the correct rune from remaining in one position for more than three questions', () => {
    const plan = createLevelFiveBattle('position-run', new FixedRandom([0.999999]), 18);
    const positions = plan.questions.map((question) => question.options.findIndex((option) => option.correct));
    for (let index = 2; index < positions.length; index += 1) {
      expect(new Set(positions.slice(index - 2, index + 1)).size).toBeGreaterThan(1);
    }
  });

  it('resolves normal, shield-breaking and piercing damage in the confirmed order', () => {
    const normal = { id: 'normal', kind: 'normal' as const, life: 2, shield: 0 };
    expect(normalBattleAttack(normal)).toMatchObject({ life: 1, shield: 0 });
    const shielded = { id: 'shielded', kind: 'shielded' as const, life: 2, shield: 1 };
    expect(normalBattleAttack(shielded)).toMatchObject({ life: 2, shield: 0 });
    expect(piercingBattleAttack(shielded)).toMatchObject({ life: 0, shield: 1 });
  });

  it('fires echo shield only for a lethal one-life hit with at least three energy', () => {
    expect(resolveEnemyAttack({ lives: 1, energy: 3 })).toEqual({ lives: 1, energy: 0, echoShieldTriggered: true });
    expect(resolveEnemyAttack({ lives: 2, energy: 5 })).toEqual({ lives: 1, energy: 5, echoShieldTriggered: false });
    expect(resolveEnemyAttack({ lives: 1, energy: 2 })).toEqual({ lives: 0, energy: 2, echoShieldTriggered: false });
  });

  it('creates the confirmed general waves with a shielded enemy only in wave five', () => {
    const plan = createLevelNineBattle('castle-run', new FixedRandom([0.18, 0.81, 0.43]));
    expect(plan.waves.map((wave) => wave.map((enemy) => enemy.kind))).toEqual(LEVEL_NINE_WAVE_KINDS);
    expect(plan.waves.flat()).toHaveLength(8);
    expect(plan.waves.slice(0, 4).flat().every((enemy) => enemy.kind === 'normal' && enemy.shield === 0)).toBe(true);
    expect(plan.waves[4][0]).toMatchObject({ kind: 'normal', life: 2, shield: 0 });
    expect(plan.waves[4][1]).toMatchObject({ kind: 'shielded', life: 2, shield: 1 });
    expect(new Set(plan.waves.flat().map((enemy) => enemy.id)).size).toBe(8);
  });

  it('interleaves all four new initials through the first eight questions', () => {
    const plan = createLevelNineBattle('castle-questions', new FixedRandom([0.11, 0.73, 0.38, 0.92]), 18);
    const firstEight = plan.questions.slice(0, 8).map((question) => question.answer);
    const newSymbols = new Set(['ㄅ', 'ㄉ', 'ㄍ', 'ㄐ']);
    expect(firstEight.filter((symbol) => newSymbols.has(symbol)).sort()).toEqual(['ㄅ', 'ㄉ', 'ㄍ', 'ㄐ'].sort());
    for (let index = 0; index < firstEight.length; index += 2) {
      expect(newSymbols.has(firstEight[index])).toBe(true);
      expect(newSymbols.has(firstEight[index + 1])).toBe(false);
    }
    const firstCycle = plan.questions.slice(0, 15).map((question) => question.answer);
    expect(new Set(firstCycle).size).toBe(15);
    for (const question of plan.questions) {
      expect(question.options).toHaveLength(3);
      expect(question.options.filter((option) => option.correct)).toHaveLength(1);
      expect(new Set(question.options.map((option) => option.symbol)).size).toBe(3);
    }
  });

  it('creates four summoned waves followed by the six-life two-shield boss', () => {
    const plan = createBossBattle('boss-run', new FixedRandom([0.16, 0.79, 0.44]));
    expect(plan.waves.map((wave) => wave.map((enemy) => enemy.kind))).toEqual(BOSS_WAVE_KINDS);
    expect(plan.waves.slice(0, 4).flat()).toHaveLength(6);
    expect(plan.waves[4]).toHaveLength(1);
    expect(plan.waves[4][0]).toMatchObject({ kind: 'boss', life: 6, shield: 2 });
    expect(new Set(plan.waves.flat().map((enemy) => enemy.id)).size).toBe(7);
  });

  it('uses all fifteen known symbols once per boss cycle and only prioritizes ㄅ／ㄉ confusion', () => {
    const plan = createBossBattle('boss-questions', new FixedRandom([0.19, 0.72, 0.36, 0.88]), 18);
    const firstCycle = plan.questions.slice(0, 15).map((question) => question.answer);
    expect(new Set(firstCycle).size).toBe(15);
    for (const question of plan.questions) {
      expect(question.options).toHaveLength(3);
      expect(question.options.filter((option) => option.correct)).toHaveLength(1);
      expect(new Set(question.options.map((option) => option.symbol)).size).toBe(3);
      if (question.answer === 'ㄅ') expect(question.options.map((option) => option.symbol)).toContain('ㄉ');
      else if (question.answer === 'ㄉ') expect(question.options.map((option) => option.symbol)).toContain('ㄅ');
    }
  });

  it('uses the confirmed remaining-life star thresholds', () => {
    expect(battleStars(5)).toBe(3);
    expect(battleStars(4)).toBe(3);
    expect(battleStars(3)).toBe(2);
    expect(battleStars(2)).toBe(2);
    expect(battleStars(1)).toBe(1);
  });
});
