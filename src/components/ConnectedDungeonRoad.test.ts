import { describe, expect, it } from 'vitest';
import { connectedDungeonFork, connectedDungeonPath } from './ConnectedDungeonRoad';

describe('connected dungeon map', () => {
  it.each(['left', 'center', 'right'] as const)('%s joins every successive junction', (side) => {
    for (let index = 0; index < 6; index += 1) {
      const path = connectedDungeonPath(index, side, true, 6);
      expect(path.approach[0]).toEqual(connectedDungeonFork(index));
      expect(path.approach.at(-1)).toEqual(path.onward[0]);
      if (index < 5) {
        expect(path.onward.at(-1)).toEqual(connectedDungeonFork(index + 1));
      } else {
        expect(path.onward.at(-1)?.y).toBeLessThan(path.onward[0].y);
        expect(path.onward.at(-1)?.y).toBeGreaterThan(connectedDungeonFork(6).y);
      }
      const wrong = connectedDungeonPath(index, side, false, 6);
      expect(wrong.approach[0]).toEqual(connectedDungeonFork(index));
      expect(wrong.onward).toEqual([]);
    }
  });
});
