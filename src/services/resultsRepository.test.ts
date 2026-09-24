import { beforeEach, describe, expect, it } from 'vitest';
import type { GameResult } from '../game/types';
import { GUEST_PROFILE_ID } from './profileRepository';
import { resultRepository } from './resultsRepository';

function guestResult(id: string, score: number): GameResult {
  return {
    id,
    profileId: GUEST_PROFILE_ID,
    modeId: 'normal',
    difficultyId: 'easy',
    score,
    correctCount: 1,
    wrongCount: 0,
    timeoutCount: 0,
    maxCombo: 0,
    completed: true,
    durationMs: 1_000,
    xpAwarded: 0,
    playedAt: new Date().toISOString(),
    appVersion: 'test'
  };
}

describe('guest result repository', () => {
  beforeEach(() => resultRepository.clearGuestResults());

  it('keeps guest scores only in memory and orders them by score', async () => {
    await resultRepository.save(guestResult('low', 10));
    await resultRepository.save(guestResult('high', 50));

    const records = await resultRepository.leaderboard(GUEST_PROFILE_ID, 'easy');
    expect(records.map((record) => record.id)).toEqual(['high', 'low']);
  });

  it('clears all guest scores when the visitor leaves', async () => {
    await resultRepository.save(guestResult('temporary', 50));
    resultRepository.clearGuestResults();

    await expect(resultRepository.leaderboard(GUEST_PROFILE_ID, 'easy'))
      .resolves.toEqual([]);
  });
});
