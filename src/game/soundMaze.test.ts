import { describe, expect, it } from 'vitest';
import {
  createLevelSevenSoundMaze,
  createLevelTwoSoundMaze,
  levelTwoBlockedRoutePoints,
  levelTwoCompleteRoutePathData,
  levelTwoConnectorPoints,
  levelTwoForkRoutePoints,
  levelTwoForkRouteSegments,
  levelTwoMagicWallPoint,
  levelTwoWrongRouteTravelPoints,
  LEVEL_TWO_MAZE_EXIT,
  LEVEL_TWO_MAZE_GEOMETRY,
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
      expect(node.routes.map((route) => route.side)).toEqual(['left', 'right']);
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

  it('provides continuous route samples for constant-speed camera movement', () => {
    for (const [index, geometry] of LEVEL_TWO_MAZE_GEOMETRY.entries()) {
      for (const side of ['left', 'right'] as const) {
        const route = levelTwoForkRoutePoints(index, side);
        const segments = levelTwoForkRouteSegments(index, side);
        expect(route.length).toBeGreaterThan(20);
        expect(route[0]).toEqual(geometry.fork);
        expect(route.at(-1)).toEqual(geometry.merge);
        expect(segments.front[0]).toEqual(geometry.fork);
        expect(segments.front.at(-1)).toEqual(geometry.walls[side]);
        expect(segments.back[0]).toEqual(geometry.walls[side]);
        expect(segments.back.at(-1)).toEqual(geometry.merge);
      }
      const connector = levelTwoConnectorPoints(index);
      expect(connector[0]).toEqual(geometry.merge);
      expect(connector.at(-1)).toEqual(index + 1 < LEVEL_TWO_MAZE_GEOMETRY.length
        ? LEVEL_TWO_MAZE_GEOMETRY[index + 1].fork
        : LEVEL_TWO_MAZE_EXIT);
      if (geometry.fragment) {
        const distanceFromRoadCenter = Math.min(...connector.map((point) => Math.hypot(
          point.x - geometry.fragment!.x,
          point.y - geometry.fragment!.y
        )));
        expect(distanceFromRoadCenter).toBeLessThan(3);
      }
    }
    expect(LEVEL_TWO_MAZE_GEOMETRY.every(({ fork, merge }) => fork.y - merge.y === 270)).toBe(true);

    const finalGeometry = LEVEL_TWO_MAZE_GEOMETRY.at(-1)!;
    const finalConnector = levelTwoConnectorPoints(LEVEL_TWO_MAZE_GEOMETRY.length - 1);
    const fragmentIndex = finalConnector.reduce((nearest, point, index) => (
      Math.hypot(point.x - finalGeometry.fragment!.x, point.y - finalGeometry.fragment!.y)
        < Math.hypot(finalConnector[nearest].x - finalGeometry.fragment!.x, finalConnector[nearest].y - finalGeometry.fragment!.y)
        ? index
        : nearest
    ), 0);
    const postFragmentDistance = finalConnector.slice(fragmentIndex + 1).reduce((total, point, index) => {
      const previous = finalConnector[fragmentIndex + index];
      return total + Math.hypot(point.x - previous.x, point.y - previous.y);
    }, 0);
    expect(postFragmentDistance / 165).toBeGreaterThanOrEqual(0.95);
    expect(postFragmentDistance / 165).toBeLessThanOrEqual(1.05);
  });

  it('keeps every fork route and connector smooth and monotonic', () => {
    const cosine = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const lengthA = Math.hypot(a.x, a.y);
      const lengthB = Math.hypot(b.x, b.y);
      return (a.x * b.x + a.y * b.y) / (lengthA * lengthB);
    };
    const delta = (from: { x: number; y: number }, to: { x: number; y: number }) => ({
      x: to.x - from.x,
      y: to.y - from.y
    });

    for (const [nodeIndex] of LEVEL_TWO_MAZE_GEOMETRY.entries()) {
      for (const side of ['left', 'right'] as const) {
        const { front, back } = levelTwoForkRouteSegments(nodeIndex, side);
        const connector = levelTwoConnectorPoints(nodeIndex);
        expect(cosine(delta(front.at(-2)!, front.at(-1)!), delta(back[0], back[1]))).toBeGreaterThan(0.997);
        expect(front.every((point, index) => index === 0 || point.y < front[index - 1].y)).toBe(true);
        expect(back.every((point, index) => index === 0 || point.y < back[index - 1].y)).toBe(true);
        expect(connector.every((point, index) => index === 0 || point.y < connector[index - 1].y)).toBe(true);
        expect(levelTwoCompleteRoutePathData(nodeIndex, side).match(/\bC\b/g)).toHaveLength(3);
      }
    }
  });

  it('extends each wrong route into an independent dead end and stops the camera before its wall', () => {
    for (const [nodeIndex, geometry] of LEVEL_TWO_MAZE_GEOMETRY.entries()) {
      for (const side of ['left', 'right'] as const) {
        const blockedRoute = levelTwoBlockedRoutePoints(nodeIndex, side);
        const travelRoute = levelTwoWrongRouteTravelPoints(nodeIndex, side);
        const wall = levelTwoMagicWallPoint(nodeIndex, side)!;
        const terminal = blockedRoute.at(-1)!;
        const stop = travelRoute.at(-1)!;
        expect(blockedRoute[0]).toEqual(geometry.fork);
        expect(geometry.walls[side].y - terminal.y).toBeCloseTo(230, 5);
        expect(side === 'left'
          ? geometry.walls[side].x - terminal.x
          : terminal.x - geometry.walls[side].x).toBeCloseTo(72, 5);
        expect(wall.x).toBeCloseTo(terminal.x, 5);
        expect(terminal.y - wall.y).toBeCloseTo(70, 5);
        expect(wall.y + 90).toBeGreaterThan(terminal.y);
        expect(Math.hypot(terminal.x - stop.x, terminal.y - stop.y)).toBeGreaterThan(20);
        expect(Math.hypot(terminal.x - stop.x, terminal.y - stop.y)).toBeLessThan(30);
      }
    }
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
      expect(node.routes.map((route) => route.side)).toEqual(['left', 'center', 'right']);
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
