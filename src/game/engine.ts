import {
  DIFFICULTY_CONFIG,
  INITIAL_LIVES,
  NORMAL_QUESTION_COUNT,
  ZHUYIN_LIST
} from './config';
import type { Difficulty, GameMode, GameSession } from './types';
import {
  getBroadDistractorPool,
  getConfusableSymbols,
  getDistractorStrategy,
  type DistractorStrategy
} from './distractors';

export type RandomSource = () => number;

export function shuffle<T>(values: readonly T[], random: RandomSource = Math.random): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export class QuestionDeck {
  private remaining: string[] = [];
  private previous: string | null = null;

  constructor(private readonly random: RandomSource = Math.random) {}

  next(): string {
    if (this.remaining.length === 0) {
      this.remaining = shuffle(ZHUYIN_LIST, this.random);
      if (
        this.previous &&
        this.remaining.length > 1 &&
        this.remaining[this.remaining.length - 1] === this.previous
      ) {
        [this.remaining[0], this.remaining[this.remaining.length - 1]] = [
          this.remaining[this.remaining.length - 1],
          this.remaining[0]
        ];
      }
    }

    const answer = this.remaining.pop()!;
    this.previous = answer;
    return answer;
  }
}

export function normalScoreForQuestion(attempts: number): number {
  return Math.max(0, 50 - Math.max(0, attempts) * 10);
}

export function endlessScoreForCombo(combo: number): number {
  return combo >= 3 ? 50 + combo * 10 : 50;
}

export function getEndlessOptionCount(questionNumber: number): number {
  if (questionNumber <= 10) return 2;
  if (questionNumber <= 20) return 3;
  if (questionNumber <= 30) return 4;
  return 6;
}

export function getEndlessTimeLimitMs(questionNumber: number): number | null {
  if (questionNumber <= 30) return null;
  if (questionNumber <= 50) return 10_000;
  if (questionNumber <= 70) return 5_000;
  if (questionNumber <= 90) return 3_000;
  return 2_000;
}

export function getNormalStars(score: number): { stars: number; crowned: boolean } {
  if (score >= 1_000) return { stars: 5, crowned: true };
  if (score >= 900) return { stars: 4, crowned: false };
  if (score >= 800) return { stars: 3, crowned: false };
  if (score >= 700) return { stars: 2, crowned: false };
  return { stars: 1, crowned: false };
}

export function createOptions(
  answer: string,
  optionCount: number,
  random: RandomSource = Math.random,
  strategy: DistractorStrategy = 'mixed'
): string[] {
  const needed = Math.max(0, optionCount - 1);
  const confusable = shuffle(getConfusableSymbols(answer), random);
  const broad = shuffle(getBroadDistractorPool(answer), random);
  const fallback = shuffle(
    ZHUYIN_LIST.filter((symbol) => symbol !== answer),
    random
  );
  const preferredConfusableCount = strategy === 'confusable'
    ? needed
    : strategy === 'mixed'
      ? Math.ceil(needed / 2)
      : 0;
  const ordered = [
    ...confusable.slice(0, preferredConfusableCount),
    ...broad,
    ...confusable.slice(preferredConfusableCount),
    ...fallback
  ];
  const distractors = [...new Set(ordered)].slice(0, needed);
  return shuffle([answer, ...distractors], random);
}

function optionCountFor(mode: GameMode, difficulty: Difficulty | null, questionNumber: number): number {
  if (mode === 'endless') return getEndlessOptionCount(questionNumber);
  return DIFFICULTY_CONFIG[difficulty ?? 'easy'].optionCount;
}

export function createGameSession(
  mode: GameMode,
  difficulty: Difficulty | null,
  deck: QuestionDeck,
  random: RandomSource = Math.random
): GameSession {
  const answer = deck.next();
  return {
    mode,
    difficulty,
    score: 0,
    questionNumber: 1,
    lives: INITIAL_LIVES,
    combo: 0,
    maxCombo: 0,
    attempts: 0,
    correctCount: 0,
    wrongCount: 0,
    timeoutCount: 0,
    currentAnswer: answer,
    options: createOptions(
      answer,
      optionCountFor(mode, difficulty, 1),
      random,
      getDistractorStrategy(mode, difficulty, 1)
    ),
    disabledOptions: [],
    selectedCorrect: null,
    isLocked: false
  };
}

export function advanceQuestion(
  session: GameSession,
  deck: QuestionDeck,
  random: RandomSource = Math.random
): GameSession {
  const questionNumber = session.questionNumber + 1;
  const answer = deck.next();
  return {
    ...session,
    questionNumber,
    attempts: 0,
    currentAnswer: answer,
    options: createOptions(
      answer,
      optionCountFor(session.mode, session.difficulty, questionNumber),
      random,
      getDistractorStrategy(session.mode, session.difficulty, questionNumber)
    ),
    disabledOptions: [],
    selectedCorrect: null,
    isLocked: false
  };
}

export function isNormalComplete(session: GameSession): boolean {
  return session.mode === 'normal' && session.questionNumber >= NORMAL_QUESTION_COUNT;
}
