import type { CampaignStars } from './campaignTypes';
import { LEVEL_EIGHT_SYMBOLS, type RandomSource } from './sequenceLock';

export const LEVEL_FIVE_BATTLE_SYMBOLS = ['ㄧ', 'ㄨ', 'ㄩ', 'ㄚ', 'ㄛ', 'ㄞ', 'ㄟ', 'ㄠ', 'ㄢ', 'ㄣ', 'ㄦ'] as const;
export const LEVEL_FIVE_WAVE_COUNTS = [1, 1, 2, 1, 2] as const;
export const LEVEL_NINE_WAVE_KINDS = [
  ['normal'],
  ['normal', 'normal'],
  ['normal'],
  ['normal', 'normal'],
  ['normal', 'shielded']
] as const satisfies readonly (readonly BattleEnemyKind[])[];
export const BOSS_WAVE_KINDS = [
  ['normal'],
  ['normal', 'normal'],
  ['shielded'],
  ['normal', 'shielded'],
  ['boss']
] as const satisfies readonly (readonly BattleEnemyKind[])[];
export const BATTLE_MAX_LIVES = 5;
export const BATTLE_MAX_ENERGY = 5;
export const BATTLE_SKILL_COST = 3;

export type BattleEnemyKind = 'normal' | 'shielded' | 'boss';

export interface BattleEnemy {
  id: string;
  kind: BattleEnemyKind;
  life: number;
  shield: number;
}

export interface BattleRuneOption {
  id: string;
  symbol: string;
  correct: boolean;
}

export interface BattleQuestion {
  id: string;
  answer: string;
  options: readonly BattleRuneOption[];
}

export interface BattlePlan {
  waves: readonly (readonly BattleEnemy[])[];
  questions: readonly BattleQuestion[];
}

export interface BattlePlayerState {
  lives: number;
  energy: number;
}

export interface EnemyAttackResult extends BattlePlayerState {
  echoShieldTriggered: boolean;
}

const browserRandom: RandomSource = { next: () => Math.random() };
const BEGINNER_DISTRACTORS: Record<string, string> = {
  ㄧ: 'ㄚ', ㄨ: 'ㄟ', ㄩ: 'ㄠ', ㄚ: 'ㄨ', ㄛ: 'ㄧ',
  ㄞ: 'ㄩ', ㄟ: 'ㄚ', ㄠ: 'ㄨ', ㄢ: 'ㄧ', ㄣ: 'ㄛ', ㄦ: 'ㄨ'
};
const GENERAL_CONFUSABLE: Record<string, string> = {
  ㄧ: 'ㄩ', ㄨ: 'ㄩ', ㄩ: 'ㄨ', ㄚ: 'ㄞ', ㄛ: 'ㄠ', ㄞ: 'ㄟ', ㄟ: 'ㄞ',
  ㄠ: 'ㄛ', ㄢ: 'ㄣ', ㄣ: 'ㄢ', ㄦ: 'ㄛ', ㄅ: 'ㄉ', ㄉ: 'ㄅ', ㄍ: 'ㄐ', ㄐ: 'ㄍ'
};

function shuffled<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random.next() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function rotate<T>(items: readonly T[]): T[] {
  return items.length < 2 ? [...items] : [...items.slice(1), items[0]];
}

function createAnswerSequence(count: number, random: RandomSource): string[] {
  const firstCycle = ['ㄦ', ...shuffled(LEVEL_FIVE_BATTLE_SYMBOLS.filter((symbol) => symbol !== 'ㄦ'), random)];
  const answers = firstCycle.slice(0, count);
  while (answers.length < count) {
    let nextCycle = shuffled(LEVEL_FIVE_BATTLE_SYMBOLS, random);
    if (answers.at(-1) === nextCycle[0]) nextCycle = rotate(nextCycle);
    answers.push(...nextCycle.slice(0, count - answers.length));
  }
  return answers;
}

function createLevelNineAnswerSequence(count: number, random: RandomSource): string[] {
  const newSymbols = shuffled(['ㄅ', 'ㄉ', 'ㄍ', 'ㄐ'], random);
  const oldSymbols = shuffled(LEVEL_FIVE_BATTLE_SYMBOLS, random);
  const firstEight = newSymbols.flatMap((symbol, index) => [symbol, oldSymbols[index]]);
  const firstCycle = [...firstEight, ...oldSymbols.slice(4)];
  const answers = firstCycle.slice(0, count);
  while (answers.length < count) {
    let nextCycle = shuffled(LEVEL_EIGHT_SYMBOLS, random);
    if (answers.at(-1) === nextCycle[0]) nextCycle = rotate(nextCycle);
    answers.push(...nextCycle.slice(0, count - answers.length));
  }
  return answers;
}

function createBossAnswerSequence(count: number, random: RandomSource): string[] {
  const answers: string[] = [];
  while (answers.length < count) {
    let cycle = shuffled(LEVEL_EIGHT_SYMBOLS, random);
    if (answers.at(-1) === cycle[0]) cycle = rotate(cycle);
    answers.push(...cycle.slice(0, count - answers.length));
  }
  return answers;
}

function createQuestions(
  runId: string,
  answers: readonly string[],
  optionCount: 2 | 3,
  random: RandomSource,
  strategy: 'beginner' | 'general' | 'boss'
): readonly BattleQuestion[] {
  let previousCorrectIndex = -1;
  let repeatedPositionCount = 0;
  return answers.map((answer, index): BattleQuestion => {
    const useConfusable = strategy === 'general'
      ? (index + 1) % 3 === 0
      : strategy === 'boss' && (answer === 'ㄅ' || answer === 'ㄉ');
    const broad = shuffled(LEVEL_EIGHT_SYMBOLS.filter((symbol) =>
      symbol !== answer && symbol !== GENERAL_CONFUSABLE[answer]
    ), random);
    const distractors = optionCount === 2
      ? [BEGINNER_DISTRACTORS[answer]]
      : useConfusable
        ? [GENERAL_CONFUSABLE[answer], broad[0]]
        : broad.slice(0, 2);
    let symbols = shuffled([answer, ...distractors], random);
    let correctIndex = symbols.indexOf(answer);
    if (correctIndex === previousCorrectIndex && repeatedPositionCount >= 2) {
      symbols = rotate(symbols);
      correctIndex = symbols.indexOf(answer);
    }
    repeatedPositionCount = correctIndex === previousCorrectIndex ? repeatedPositionCount + 1 : 1;
    previousCorrectIndex = correctIndex;
    const questionId = `${runId}:battle:question-${String(index + 1).padStart(2, '0')}`;
    return {
      id: questionId,
      answer,
      options: symbols.map((symbol, optionIndex) => ({
        id: `${questionId}:rune-${optionIndex + 1}`,
        symbol,
        correct: symbol === answer
      }))
    };
  });
}

export function createLevelFiveBattle(
  runId: string,
  random: RandomSource = browserRandom,
  questionCount = 24
): BattlePlan {
  const waves = LEVEL_FIVE_WAVE_COUNTS.map((enemyCount, waveIndex) =>
    Array.from({ length: enemyCount }, (_, enemyIndex): BattleEnemy => ({
      id: `${runId}:battle:wave-${String(waveIndex + 1).padStart(2, '0')}:enemy-${enemyIndex + 1}`,
      kind: 'normal',
      life: 2,
      shield: 0
    }))
  );
  const answers = createAnswerSequence(questionCount, random);
  return { waves, questions: createQuestions(runId, answers, 2, random, 'beginner') };
}

export function createLevelNineBattle(
  runId: string,
  random: RandomSource = browserRandom,
  questionCount = 30
): BattlePlan {
  const waves = LEVEL_NINE_WAVE_KINDS.map((kinds, waveIndex) =>
    kinds.map((kind, enemyIndex): BattleEnemy => ({
      id: `${runId}:castle-battle:wave-${String(waveIndex + 1).padStart(2, '0')}:enemy-${enemyIndex + 1}`,
      kind,
      life: 2,
      shield: kind === 'shielded' ? 1 : 0
    }))
  );
  const answers = createLevelNineAnswerSequence(questionCount, random);
  return { waves, questions: createQuestions(runId, answers, 3, random, 'general') };
}

export function createBossBattle(
  runId: string,
  random: RandomSource = browserRandom,
  questionCount = 36
): BattlePlan {
  const waves = BOSS_WAVE_KINDS.map((kinds, waveIndex) =>
    kinds.map((kind, enemyIndex): BattleEnemy => ({
      id: `${runId}:boss-battle:wave-${String(waveIndex + 1).padStart(2, '0')}:enemy-${enemyIndex + 1}`,
      kind,
      life: kind === 'boss' ? 6 : 2,
      shield: kind === 'boss' ? 2 : kind === 'shielded' ? 1 : 0
    }))
  );
  const answers = createBossAnswerSequence(questionCount, random);
  return { waves, questions: createQuestions(runId, answers, 3, random, 'boss') };
}

export function normalBattleAttack(enemy: BattleEnemy): BattleEnemy {
  if (enemy.shield > 0) return { ...enemy, shield: enemy.shield - 1 };
  return { ...enemy, life: Math.max(0, enemy.life - 1) };
}

export function piercingBattleAttack(enemy: BattleEnemy): BattleEnemy {
  return { ...enemy, life: Math.max(0, enemy.life - 2) };
}

export function resolveEnemyAttack(player: BattlePlayerState): EnemyAttackResult {
  if (player.lives === 1 && player.energy >= BATTLE_SKILL_COST) {
    return {
      lives: 1,
      energy: player.energy - BATTLE_SKILL_COST,
      echoShieldTriggered: true
    };
  }
  return {
    lives: Math.max(0, player.lives - 1),
    energy: player.energy,
    echoShieldTriggered: false
  };
}

export function battleStars(remainingLives: number): CampaignStars {
  if (remainingLives >= 4) return 3;
  if (remainingLives >= 2) return 2;
  return 1;
}
