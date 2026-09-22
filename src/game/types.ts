export type GameMode = 'normal' | 'endless';
export type Difficulty = 'easy' | 'normal' | 'hard';

export type LeaderboardPage = Difficulty | 'endless';

export interface GameResult {
  id: string;
  profileId: string;
  modeId: GameMode;
  difficultyId: Difficulty | null;
  score: number;
  correctCount: number;
  wrongCount: number;
  timeoutCount: number;
  maxCombo: number;
  completed: boolean;
  durationMs: number;
  xpAwarded: number;
  playedAt: string;
  appVersion: string;
}

export interface GameSession {
  mode: GameMode;
  difficulty: Difficulty | null;
  score: number;
  questionNumber: number;
  lives: number;
  combo: number;
  maxCombo: number;
  attempts: number;
  correctCount: number;
  wrongCount: number;
  timeoutCount: number;
  currentAnswer: string;
  options: string[];
  disabledOptions: string[];
  selectedCorrect: string | null;
  isLocked: boolean;
}
