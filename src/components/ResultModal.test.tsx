import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { GameResult } from '../game/types';
import { ResultModal } from './ResultModal';

describe('ResultModal', () => {
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

  it('describes the earned amount as experience points in Chinese', () => {
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

  it('offers a retry action when the result was not saved', () => {
    const markup = renderToStaticMarkup(
      <ResultModal
        result={result}
        saveError
        saving
        onRetrySave={() => undefined}
        onReplay={() => undefined}
        onLeaderboard={() => undefined}
        onMenu={() => undefined}
      />
    );

    expect(markup).toContain('本次冒險紀錄尚未成功保存，請保持頁面開啟並重試。');
    expect(markup).toContain('重新儲存中…');
    expect(markup.match(/disabled=""/g)).toHaveLength(4);
  });
});
