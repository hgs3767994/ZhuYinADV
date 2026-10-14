import { describe, expect, it } from 'vitest';
import {
  createLevelSevenSoundMaze,
  createLevelTwoSoundMaze,
  LEVEL_SEVEN_OLD_SYMBOLS,
  LEVEL_SEVEN_SYMBOLS,
  soundMazeStars
} from './soundMaze';
import type { RandomSource } from './sequenceLock';

class FixedRandom implements RandomSource {
  private index = 0;
  constructor(private readonly values: readonly number[]) {}
  next(): number {
    const value = this.values[this.index % this.values.length] ?? 0;
    this.index += 1;
    return value;
  }
}

describe('level two sound maze', () => {
  it('creates five stable fork nodes using every level-one symbol exactly once', () => {
    const nodes = createLevelTwoSoundMaze('maze-run', new FixedRandom([0.1, 0.8, 0.3]));
    expect(nodes).toHaveLength(5);
    expect([...nodes.map((node) => node.targetSymbol)].sort()).toEqual(['ㄚ', 'ㄛ', 'ㄧ', 'ㄨ', 'ㄩ'].sort());
    expect(nodes.filter((node) => node.fragment).map((node) => node.id)).toEqual([
      'maze-run:maze-node-01',
      'maze-run:maze-node-03',
      'maze-run:maze-node-05'
    ]);
    for (const node of nodes) {
      expect(node.routes).toHaveLength(2);
      expect(node.routes.filter((route) => route.correct)).toHaveLength(1);
      expect(new Set(node.routes.map((route) => route.symbol)).size).toBe(2);
      expect(node.routes.every((route) => route.id.startsWith(node.id))).toBe(true);
    }
  });

  it('uses the confirmed wrong-route star thresholds', () => {
    expect(soundMazeStars(0)).toBe(3);
    expect(soundMazeStars(1)).toBe(3);
    expect(soundMazeStars(2)).toBe(2);
    expect(soundMazeStars(3)).toBe(2);
    expect(soundMazeStars(4)).toBe(1);
    expect(soundMazeStars(12)).toBe(1);
  });

  it('creates six stable rune-gate nodes with the confirmed level-seven targets', () => {
    const nodes = createLevelSevenSoundMaze('gate-run', new FixedRandom([0.13, 0.84, 0.37, 0.62]));
    expect(nodes).toHaveLength(6);
    expect(nodes.filter((node) => node.targetSymbol === 'ㄅ')).toHaveLength(2);
    expect(nodes.filter((node) => node.targetSymbol === 'ㄉ')).toHaveLength(2);
    const oldTargets = nodes.filter((node) => LEVEL_SEVEN_OLD_SYMBOLS.includes(node.targetSymbol as typeof LEVEL_SEVEN_OLD_SYMBOLS[number]));
    expect(oldTargets).toHaveLength(2);
    expect(new Set(oldTargets.map((node) => node.targetSymbol)).size).toBe(2);
    expect(nodes.filter((node) => node.fragment).map((node) => node.id)).toEqual([
      'gate-run:rune-gate-node-01',
      'gate-run:rune-gate-node-03',
      'gate-run:rune-gate-node-06'
    ]);
    for (const node of nodes) {
      expect(node.routes).toHaveLength(3);
      expect(node.routes.filter((route) => route.correct)).toHaveLength(1);
      expect(new Set(node.routes.map((route) => route.symbol)).size).toBe(3);
      expect(node.routes.every((route) => LEVEL_SEVEN_SYMBOLS.includes(route.symbol as typeof LEVEL_SEVEN_SYMBOLS[number]))).toBe(true);
      expect(node.routes.every((route) => route.id.startsWith(node.id))).toBe(true);
    }
  });

  it('never uses ㄅ and ㄉ as distractors for each other', () => {
    const nodes = createLevelSevenSoundMaze('new-sounds-run', new FixedRandom([0.05, 0.91, 0.28]));
    for (const node of nodes.filter((item) => item.targetSymbol === 'ㄅ' || item.targetSymbol === 'ㄉ')) {
      const forbidden = node.targetSymbol === 'ㄅ' ? 'ㄉ' : 'ㄅ';
      expect(node.routes.map((route) => route.symbol)).not.toContain(forbidden);
    }
  });
});
