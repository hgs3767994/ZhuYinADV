import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { GameResult } from '../game/types';
import { ResultModal } from './ResultModal';

describe('ResultModal', () => {
  it('describes the earned amount as experience points in Chinese', () => {
    const result: GameResult = {
      id: 'result-1',
      xpEventId: 'event-1',
      profileId: 'profile-1',
      modeId: 'normal',
      difficultyId: 'easy',
      score: 1_000,
      correctCount: 20,
      wrongCount: 0,
      timeoutCount: 0,
      maxCombo: 0,
      completed: true,
      durationMs: 10_000,
      xpAwarded: 40,
      playedAt: '2026-10-06T00:00:00.000Z',
      appVersion: 'test'
    };
    const markup = renderToStaticMarkup(
      <ResultModal
        result={result}
        onReplay={() => undefined}
        onLeaderboard={() => undefined}
        onMenu={() => undefined}
      />
    );

    expect(markup).toContain('本次獲得40經驗值');
    expect(markup).not.toContain('＋40 XP');
  });
});
