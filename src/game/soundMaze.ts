import type { CampaignStars } from './campaignTypes';
import { LEVEL_ONE_SYMBOLS, type RandomSource } from './sequenceLock';

export const LEVEL_SEVEN_OLD_SYMBOLS = ['ㄧ', 'ㄨ', 'ㄩ', 'ㄚ', 'ㄛ', 'ㄞ', 'ㄟ', 'ㄠ', 'ㄢ', 'ㄣ', 'ㄦ'] as const;
export const LEVEL_SEVEN_SYMBOLS = [...LEVEL_SEVEN_OLD_SYMBOLS, 'ㄅ', 'ㄉ'] as const;

export interface SoundMazeRoute {
  id: string;
  symbol: string;
  correct: boolean;
}

export interface SoundMazeNode {
  id: string;
  targetSymbol: string;
  routes: readonly SoundMazeRoute[];
  fragment: boolean;
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
        correct: symbol === targetSymbol
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
        correct: symbol === targetSymbol
      }))
    };
  });
}

export function soundMazeStars(wrongRouteCount: number): CampaignStars {
  if (wrongRouteCount <= 1) return 3;
  if (wrongRouteCount <= 3) return 2;
  return 1;
}
