import { ZHUYIN_LIST } from './config';

export type DistractorStrategy = 'broad' | 'mixed' | 'confusable';
export type ConfusionKind = 'sound' | 'shape';

// 常見的單音辨識混淆。聲音與字形刻意分開，方便後續依學習紀錄調整權重。
const SOUND_CONFUSION_GROUPS: readonly (readonly string[])[] = [
  ['ㄓ', 'ㄗ'],
  ['ㄔ', 'ㄘ'],
  ['ㄕ', 'ㄙ'],
  ['ㄖ', 'ㄌ'],
  ['ㄈ', 'ㄏ'],
  ['ㄋ', 'ㄌ'],
  ['ㄣ', 'ㄥ'],
  ['ㄝ', 'ㄟ'],
  ['ㄦ', 'ㄜ'],
  ['ㄛ', 'ㄡ'],
  ['ㄢ', 'ㄤ']
];

const SHAPE_CONFUSION_GROUPS: readonly (readonly string[])[] = [
  ['ㄅ', 'ㄉ', 'ㄌ'],
  ['ㄇ', 'ㄈ', 'ㄑ', 'ㄩ'],
  ['ㄙ', 'ㄌ', 'ㄥ']
];

function peersFrom(groups: readonly (readonly string[])[], symbol: string): string[] {
  return groups
    .filter((group) => group.includes(symbol))
    .flatMap((group) => group.filter((candidate) => candidate !== symbol));
}

export function getConfusableSymbols(symbol: string, kind?: ConfusionKind): string[] {
  const groups = kind === 'sound'
    ? SOUND_CONFUSION_GROUPS
    : kind === 'shape'
      ? SHAPE_CONFUSION_GROUPS
      : [...SOUND_CONFUSION_GROUPS, ...SHAPE_CONFUSION_GROUPS];
  return [...new Set(peersFrom(groups, symbol))];
}

export function getDistractorStrategy(
  mode: 'normal' | 'endless',
  difficulty: 'easy' | 'normal' | 'hard' | null,
  questionNumber: number
): DistractorStrategy {
  if (mode === 'normal') {
    if (difficulty === 'hard') return 'confusable';
    if (difficulty === 'normal') return 'mixed';
    return 'broad';
  }

  if (questionNumber <= 10) return 'broad';
  if (questionNumber <= 30) return 'mixed';
  return 'confusable';
}

export function getBroadDistractorPool(answer: string): string[] {
  const confusable = new Set(getConfusableSymbols(answer));
  return ZHUYIN_LIST.filter((symbol) => symbol !== answer && !confusable.has(symbol));
}
