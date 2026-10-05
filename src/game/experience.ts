import type { Difficulty, GameResult } from './types';

export type RankId =
  | 'chicken'
  | 'rabbit'
  | 'chipmunk'
  | 'raccoon'
  | 'deer'
  | 'sheep'
  | 'zebra'
  | 'hippo'
  | 'giraffe'
  | 'elephant';

export interface RankDefinition {
  id: RankId;
  name: string;
  minimumXp: number;
}

export interface ExperienceProgress {
  totalXp: number;
  rankId: RankId;
  rankName: string;
  levelXp: number;
  levelXpRequired: number | null;
  percent: number;
  isMaxRank: boolean;
}

export const RANKS: readonly RankDefinition[] = [
  { id: 'chicken', name: '小雞', minimumXp: 0 },
  { id: 'rabbit', name: '兔子', minimumXp: 100 },
  { id: 'chipmunk', name: '花栗鼠', minimumXp: 250 },
  { id: 'raccoon', name: '浣熊', minimumXp: 450 },
  { id: 'deer', name: '鹿', minimumXp: 700 },
  { id: 'sheep', name: '綿羊', minimumXp: 1_000 },
  { id: 'zebra', name: '斑馬', minimumXp: 1_400 },
  { id: 'hippo', name: '河馬', minimumXp: 1_900 },
  { id: 'giraffe', name: '長頸鹿', minimumXp: 2_500 },
  { id: 'elephant', name: '大象', minimumXp: 3_200 }
] as const;

const STAR_XP = [0, 0, 5, 10, 15, 20] as const;
const DIFFICULTY_XP: Record<Difficulty, number> = {
  easy: 0,
  normal: 10,
  hard: 20
};

export function getNormalStars(score: number): number {
  if (score >= 1_000) return 5;
  if (score >= 950) return 4;
  if (score >= 900) return 3;
  if (score >= 850) return 2;
  return 1;
}

export function normalExperience(score: number, difficulty: Difficulty, completed: boolean): number {
  if (!completed) return 0;
  const stars = getNormalStars(score);
  return 20 + STAR_XP[stars] + (stars >= 3 ? DIFFICULTY_XP[difficulty] : 0);
}

export function endlessExperience(correctCount: number, maxCombo: number): number {
  const comboBonus = Math.floor(Math.max(0, maxCombo) / 5) * 5;
  return Math.min(150, Math.max(0, correctCount) + comboBonus);
}

export function calculateGameExperience(
  result: Pick<GameResult, 'modeId' | 'difficultyId' | 'score' | 'completed' | 'correctCount' | 'maxCombo'>
): number {
  if (result.modeId === 'endless') {
    return endlessExperience(result.correctCount, result.maxCombo);
  }
  return normalExperience(result.score, result.difficultyId ?? 'easy', result.completed);
}

export function rankById(rankId: RankId): RankDefinition {
  return RANKS.find((rank) => rank.id === rankId) ?? RANKS[0];
}

export function experienceProgress(totalXp: number): ExperienceProgress {
  const safeTotal = Math.max(0, Math.floor(totalXp));
  let index = RANKS.length - 1;
  while (index > 0 && safeTotal < RANKS[index].minimumXp) index -= 1;
  const rank = RANKS[index];
  const next = RANKS[index + 1];
  const levelXp = safeTotal - rank.minimumXp;
  const levelXpRequired = next ? next.minimumXp - rank.minimumXp : null;
  return {
    totalXp: safeTotal,
    rankId: rank.id,
    rankName: rank.name,
    levelXp,
    levelXpRequired,
    percent: levelXpRequired === null
      ? 100
      : Math.max(0, Math.min(100, Math.floor((levelXp / levelXpRequired) * 100))),
    isMaxRank: !next
  };
}
