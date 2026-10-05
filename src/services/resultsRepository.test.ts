import { beforeEach, describe, expect, it } from 'vitest';
import type { GameResult } from '../game/types';
import { GUEST_PROFILE_ID } from './profileRepository';
import { resultRepository } from './resultsRepository';

function guestResult(id: string, score: number): GameResult {
  return {
    id,
    xpEventId: `event-${id}`,
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
    xpAwarded: 20,
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

  it('deduplicates XP events and clears temporary guest XP', async () => {
    const result = guestResult('same-game', 10);
    const first = await resultRepository.save(result);
    const duplicate = await resultRepository.save(result);

    expect(first.experience.totalXp).toBe(20);
    expect(duplicate).toMatchObject({ duplicate: true });
    await expect(resultRepository.experience(GUEST_PROFILE_ID))
      .resolves.toMatchObject({ totalXp: 20 });

    resultRepository.clearGuestResults();
    await expect(resultRepository.experience(GUEST_PROFILE_ID))
      .resolves.toMatchObject({ totalXp: 0 });
  });

  it('rejects a reused event ID carrying a different result', async () => {
    const original = guestResult('original', 10);
    await resultRepository.save(original);

    await expect(resultRepository.save({
      ...guestResult('different', 50),
      xpEventId: original.xpEventId
    })).rejects.toThrow('不一致');
  });
});
