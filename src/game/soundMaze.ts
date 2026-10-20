import type { CampaignStars } from './campaignTypes';
import { LEVEL_ONE_SYMBOLS, type RandomSource } from './sequenceLock';

export const LEVEL_SEVEN_OLD_SYMBOLS = ['ㄧ', 'ㄨ', 'ㄩ', 'ㄚ', 'ㄛ', 'ㄞ', 'ㄟ', 'ㄠ', 'ㄢ', 'ㄣ', 'ㄦ'] as const;
export const LEVEL_SEVEN_SYMBOLS = [...LEVEL_SEVEN_OLD_SYMBOLS, 'ㄅ', 'ㄉ'] as const;

export interface SoundMazeRoute {
  id: string;
  symbol: string;
  correct: boolean;
  side: 'left' | 'center' | 'right';
}

export interface SoundMazeNode {
  id: string;
  targetSymbol: string;
  routes: readonly SoundMazeRoute[];
  fragment: boolean;
}

export interface SoundMazePoint {
  x: number;
  y: number;
}

export interface SoundMazeMapNode {
  fork: SoundMazePoint;
  merge: SoundMazePoint;
  fragment?: SoundMazePoint;
  walls: Readonly<Record<'left' | 'right', SoundMazePoint>>;
  landmark: 'stone' | 'fence' | 'sign' | 'rocks' | 'arch';
}

export const LEVEL_TWO_MAZE_EXIT: SoundMazePoint = { x: 320, y: -50 };

export const LEVEL_TWO_MAZE_GEOMETRY: readonly SoundMazeMapNode[] = [
  { fork: { x: 320, y: 2100 }, merge: { x: 320, y: 1830 }, fragment: { x: 338, y: 1790 }, walls: { left: { x: 175, y: 1945 }, right: { x: 465, y: 1945 } }, landmark: 'stone' },
  { fork: { x: 440, y: 1680 }, merge: { x: 440, y: 1410 }, walls: { left: { x: 295, y: 1525 }, right: { x: 585, y: 1525 } }, landmark: 'fence' },
  { fork: { x: 220, y: 1260 }, merge: { x: 220, y: 990 }, fragment: { x: 250, y: 950 }, walls: { left: { x: 75, y: 1105 }, right: { x: 365, y: 1105 } }, landmark: 'sign' },
  { fork: { x: 420, y: 840 }, merge: { x: 420, y: 570 }, walls: { left: { x: 275, y: 685 }, right: { x: 565, y: 685 } }, landmark: 'rocks' },
  { fork: { x: 300, y: 420 }, merge: { x: 300, y: 150 }, fragment: { x: 302, y: 110 }, walls: { left: { x: 155, y: 265 }, right: { x: 445, y: 265 } }, landmark: 'arch' }
] as const;

function cubicPoint(
  start: SoundMazePoint,
  controlA: SoundMazePoint,
  controlB: SoundMazePoint,
  end: SoundMazePoint,
  amount: number
): SoundMazePoint {
  const inverse = 1 - amount;
  return {
    x: inverse ** 3 * start.x + 3 * inverse ** 2 * amount * controlA.x + 3 * inverse * amount ** 2 * controlB.x + amount ** 3 * end.x,
    y: inverse ** 3 * start.y + 3 * inverse ** 2 * amount * controlA.y + 3 * inverse * amount ** 2 * controlB.y + amount ** 3 * end.y
  };
}

interface SoundMazeCubicSegment {
  start: SoundMazePoint;
  controlA: SoundMazePoint;
  controlB: SoundMazePoint;
  end: SoundMazePoint;
}

function levelTwoForkRouteCurves(
  nodeIndex: number,
  side: 'left' | 'right'
): Readonly<{ front: SoundMazeCubicSegment; back: SoundMazeCubicSegment }> | null {
  const geometry = LEVEL_TWO_MAZE_GEOMETRY[nodeIndex];
  if (!geometry) return null;
  const direction = side === 'left' ? -1 : 1;
  const start = geometry.fork;
  const wall = geometry.walls[side];

  return {
    front: {
      start,
      controlA: { x: start.x, y: start.y - 88 },
      controlB: { x: wall.x, y: wall.y + 82 },
      end: wall
    },
    back: {
      start: wall,
      controlA: { x: wall.x, y: wall.y - 76 },
      controlB: { x: geometry.merge.x, y: geometry.merge.y + 88 },
      end: geometry.merge
    }
  };
}

function cubicCommand(segment: SoundMazeCubicSegment): string {
  return `C ${segment.controlA.x} ${segment.controlA.y}, ${segment.controlB.x} ${segment.controlB.y}, ${segment.end.x} ${segment.end.y}`;
}

function levelTwoConnectorCurves(nodeIndex: number): readonly SoundMazeCubicSegment[] {
  const geometry = LEVEL_TWO_MAZE_GEOMETRY[nodeIndex];
  if (!geometry) return [];
  const destination = nodeIndex + 1 < LEVEL_TWO_MAZE_GEOMETRY.length
    ? LEVEL_TWO_MAZE_GEOMETRY[nodeIndex + 1].fork
    : LEVEL_TWO_MAZE_EXIT;

  const verticalGap = geometry.merge.y - destination.y;
  const tangentLength = Math.max(54, verticalGap * 0.42);
  return [{
    start: geometry.merge,
    controlA: { x: geometry.merge.x, y: geometry.merge.y - tangentLength },
    controlB: { x: destination.x, y: destination.y + tangentLength },
    end: destination
  }];
}

export function levelTwoForkRoutePathData(
  nodeIndex: number,
  side: 'left' | 'right',
  segment: 'front' | 'back' | 'full'
): string {
  const curves = levelTwoForkRouteCurves(nodeIndex, side);
  if (!curves) return '';
  const entry = `M ${curves.front.start.x} ${curves.front.start.y}`;
  if (segment === 'front') return `${entry} ${cubicCommand(curves.front)}`;
  if (segment === 'back') return `M ${curves.back.start.x} ${curves.back.start.y} ${cubicCommand(curves.back)}`;
  return `${entry} ${cubicCommand(curves.front)} ${cubicCommand(curves.back)}`;
}

export function levelTwoCompleteRoutePathData(nodeIndex: number, side: 'left' | 'right'): string {
  const route = levelTwoForkRoutePathData(nodeIndex, side, 'full');
  const connectorCurves = levelTwoConnectorCurves(nodeIndex);
  if (!route || connectorCurves.length === 0) return '';
  return `${route} ${connectorCurves.map(cubicCommand).join(' ')}`;
}

export function levelTwoConnectorPathData(nodeIndex: number): string {
  const curves = levelTwoConnectorCurves(nodeIndex);
  if (curves.length === 0) return '';
  return `M ${curves[0].start.x} ${curves[0].start.y} ${curves.map(cubicCommand).join(' ')}`;
}

export function levelTwoForkRouteSegments(
  nodeIndex: number,
  side: 'left' | 'right'
): Readonly<{ front: readonly SoundMazePoint[]; back: readonly SoundMazePoint[] }> {
  const curves = levelTwoForkRouteCurves(nodeIndex, side);
  if (!curves) return { front: [], back: [] };
  const front: SoundMazePoint[] = [];
  const back: SoundMazePoint[] = [];
  const sampleCount = 64;
  for (let step = 0; step <= sampleCount; step += 1) {
    front.push(cubicPoint(curves.front.start, curves.front.controlA, curves.front.controlB, curves.front.end, step / sampleCount));
  }
  for (let step = 0; step <= sampleCount; step += 1) {
    back.push(cubicPoint(curves.back.start, curves.back.controlA, curves.back.controlB, curves.back.end, step / sampleCount));
  }
  return { front, back };
}

export function levelTwoForkRoutePoints(
  nodeIndex: number,
  side: 'left' | 'right'
): readonly SoundMazePoint[] {
  const { front, back } = levelTwoForkRouteSegments(nodeIndex, side);
  return [...front, ...back.slice(1)];
}

function takePolylineDistance(points: readonly SoundMazePoint[], distance: number): readonly SoundMazePoint[] {
  if (points.length <= 1 || distance <= 0) return points.slice(0, 1);
  const result: SoundMazePoint[] = [points[0]];
  let remaining = distance;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
    if (segmentLength <= remaining + 0.001) {
      result.push(end);
      remaining -= segmentLength;
      continue;
    }
    const amount = segmentLength === 0 ? 1 : remaining / segmentLength;
    result.push({
      x: start.x + (end.x - start.x) * amount,
      y: start.y + (end.y - start.y) * amount
    });
    return result;
  }
  return result;
}

function polylineLength(points: readonly SoundMazePoint[]): number {
  return points.slice(1).reduce((total, point, index) => total + Math.hypot(
    point.x - points[index].x,
    point.y - points[index].y
  ), 0);
}

const BLOCKED_ROUTE_CAMERA_CLEARANCE = 26;
const MAGIC_WALL_TERMINAL_OVERLAP = 70;

function levelTwoWrongRouteExtensionPoints(
  nodeIndex: number,
  side: 'left' | 'right'
): readonly SoundMazePoint[] {
  const geometry = LEVEL_TWO_MAZE_GEOMETRY[nodeIndex];
  if (!geometry) return [];
  const direction = side === 'left' ? -1 : 1;
  const start = geometry.walls[side];
  const controlA = { x: start.x + direction * 6, y: start.y - 78 };
  const controlB = { x: start.x + direction * 58, y: start.y - 165 };
  const end = { x: start.x + direction * 72, y: start.y - 230 };
  const points: SoundMazePoint[] = [];
  const sampleCount = 64;
  for (let step = 0; step <= sampleCount; step += 1) {
    points.push(cubicPoint(start, controlA, controlB, end, step / sampleCount));
  }
  return points;
}

export function levelTwoBlockedRoutePoints(
  nodeIndex: number,
  side: 'left' | 'right'
): readonly SoundMazePoint[] {
  const { front } = levelTwoForkRouteSegments(nodeIndex, side);
  const extension = levelTwoWrongRouteExtensionPoints(nodeIndex, side);
  return [...front, ...extension.slice(1)];
}

export function levelTwoWrongRouteTravelPoints(
  nodeIndex: number,
  side: 'left' | 'right'
): readonly SoundMazePoint[] {
  const blockedRoute = levelTwoBlockedRoutePoints(nodeIndex, side);
  return takePolylineDistance(
    blockedRoute,
    Math.max(0, polylineLength(blockedRoute) - BLOCKED_ROUTE_CAMERA_CLEARANCE)
  );
}

export function levelTwoMagicWallPoint(
  nodeIndex: number,
  side: 'left' | 'right'
): SoundMazePoint | null {
  const routeTerminal = levelTwoWrongRouteExtensionPoints(nodeIndex, side).at(-1);
  if (!routeTerminal) return null;
  return {
    x: routeTerminal.x,
    y: routeTerminal.y - MAGIC_WALL_TERMINAL_OVERLAP
  };
}

export function levelTwoConnectorPoints(nodeIndex: number): readonly SoundMazePoint[] {
  const curves = levelTwoConnectorCurves(nodeIndex);
  if (curves.length === 0) return [];
  const points: SoundMazePoint[] = [];
  const samplesPerCurve = 64;
  for (const [curveIndex, curve] of curves.entries()) {
    for (let step = curveIndex === 0 ? 0 : 1; step <= samplesPerCurve; step += 1) {
      points.push(cubicPoint(curve.start, curve.controlA, curve.controlB, curve.end, step / samplesPerCurve));
    }
  }
  return points;
}

const FRAGMENT_NODE_INDEXES = new Set([0, 2, 4]);
const LEVEL_SEVEN_FRAGMENT_NODE_INDEXES = new Set([0, 2, 5]);
const DISTRACTOR: Record<string, string> = {
  ㄧ: 'ㄚ',
  ㄨ: 'ㄛ',
  ㄩ: 'ㄚ',
  ㄚ: 'ㄨ',
  ㄛ: 'ㄧ'
};
const browserRandom: RandomSource = { next: () => Math.random() };

const LEVEL_SEVEN_CONFUSABLE: Record<string, string> = {
  ㄧ: 'ㄩ', ㄨ: 'ㄩ', ㄩ: 'ㄨ', ㄚ: 'ㄞ', ㄛ: 'ㄠ', ㄞ: 'ㄟ', ㄟ: 'ㄞ',
  ㄠ: 'ㄛ', ㄢ: 'ㄣ', ㄣ: 'ㄢ', ㄦ: 'ㄛ'
};

function shuffled<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random.next() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function createLevelTwoSoundMaze(
  runId: string,
  random: RandomSource = browserRandom
): readonly SoundMazeNode[] {
  const targets = shuffled(LEVEL_ONE_SYMBOLS, random);
  return targets.map((targetSymbol, nodeIndex) => {
    const nodeNumber = String(nodeIndex + 1).padStart(2, '0');
    const nodeId = `${runId}:maze-node-${nodeNumber}`;
    const routeSymbols = shuffled([targetSymbol, DISTRACTOR[targetSymbol]], random);
    return {
      id: nodeId,
      targetSymbol,
      fragment: FRAGMENT_NODE_INDEXES.has(nodeIndex),
      routes: routeSymbols.map((symbol, routeIndex) => ({
        id: `${nodeId}:route-${String(routeIndex + 1).padStart(2, '0')}`,
        symbol,
        correct: symbol === targetSymbol,
        side: routeIndex === 0 ? 'left' : 'right'
      }))
    };
  });
}

export function createLevelSevenSoundMaze(
  runId: string,
  random: RandomSource = browserRandom
): readonly SoundMazeNode[] {
  const oldTargets = shuffled(LEVEL_SEVEN_OLD_SYMBOLS, random).slice(0, 2);
  const targets = shuffled(['ㄅ', 'ㄅ', 'ㄉ', 'ㄉ', ...oldTargets], random);
  const seenNewSymbols = new Set<string>();
  return targets.map((targetSymbol, nodeIndex) => {
    const nodeNumber = String(nodeIndex + 1).padStart(2, '0');
    const nodeId = `${runId}:rune-gate-node-${nodeNumber}`;
    const isNewSymbol = targetSymbol === 'ㄅ' || targetSymbol === 'ㄉ';
    const firstNewOccurrence = isNewSymbol && !seenNewSymbols.has(targetSymbol);
    if (isNewSymbol) seenNewSymbols.add(targetSymbol);

    const forbidden = new Set([targetSymbol]);
    if (isNewSymbol) forbidden.add(targetSymbol === 'ㄅ' ? 'ㄉ' : 'ㄅ');
    const broadOldPool = shuffled(
      LEVEL_SEVEN_OLD_SYMBOLS.filter((symbol) => !forbidden.has(symbol)),
      random
    );
    const confusable = LEVEL_SEVEN_CONFUSABLE[targetSymbol];
    const distractors = firstNewOccurrence || !confusable
      ? broadOldPool.slice(0, 2)
      : [confusable, ...broadOldPool.filter((symbol) => symbol !== confusable)].slice(0, 2);
    const optionSymbols = shuffled([targetSymbol, ...distractors], random);
    return {
      id: nodeId,
      targetSymbol,
      fragment: LEVEL_SEVEN_FRAGMENT_NODE_INDEXES.has(nodeIndex),
      routes: optionSymbols.map((symbol, routeIndex) => ({
        id: `${nodeId}:gate-${String(routeIndex + 1).padStart(2, '0')}`,
        symbol,
        correct: symbol === targetSymbol,
        side: routeIndex === 0 ? 'left' : routeIndex === 1 ? 'center' : 'right'
      }))
    };
  });
}

export function soundMazeStars(wrongRouteCount: number): CampaignStars {
  if (wrongRouteCount <= 1) return 3;
  if (wrongRouteCount <= 3) return 2;
  return 1;
}
