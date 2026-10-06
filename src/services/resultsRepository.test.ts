import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { GameResult } from '../game/types';
import {
  DATABASE_NAME,
  EXPERIENCE_STORE,
  openDatabase,
  PROFILE_STORE,
  requestResult,
  RESULT_STORE,
  SETTINGS_STORE,
  transactionDone,
  XP_EVENT_STORE
} from './database';
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

function persistentResult(overrides: Partial<GameResult> = {}): GameResult {
  return {
    id: 'persistent-result',
    xpEventId: 'persistent-event',
    profileId: 'persistent-profile',
    modeId: 'normal',
    difficultyId: 'easy',
    score: 1_000,
    correctCount: 20,
    wrongCount: 0,
    timeoutCount: 0,
    maxCombo: 20,
    completed: true,
    durationMs: 20_000,
    xpAwarded: 0,
    playedAt: '2026-10-07T00:00:00.000Z',
    appVersion: 'test',
    ...overrides
  };
}

function deleteTestDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('無法刪除測試資料庫'));
    request.onblocked = () => reject(new Error('測試資料庫仍被開啟'));
  });
}

async function persistentStoreSnapshot() {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(
      [RESULT_STORE, EXPERIENCE_STORE, XP_EVENT_STORE],
      'readonly'
    );
    const [results, experience, events] = await Promise.all([
      requestResult(transaction.objectStore(RESULT_STORE).getAll()),
      requestResult(transaction.objectStore(EXPERIENCE_STORE).get('persistent-profile')),
      requestResult(transaction.objectStore(XP_EVENT_STORE).getAll())
    ]);
    return { results, experience, events };
  } finally {
    database.close();
  }
}

function createVersionThreeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 3);
    request.onupgradeneeded = () => {
      const database = request.result;
      const resultStore = database.createObjectStore(RESULT_STORE, { keyPath: 'id' });
      resultStore.createIndex('profileId', 'profileId', { unique: false });
      const profileStore = database.createObjectStore(PROFILE_STORE, { keyPath: 'id' });
      profileStore.createIndex('normalizedName', 'normalizedName', { unique: true });
      database.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });

      resultStore.add({ id: 'legacy-result', profileId: 'legacy-profile', score: 900 });
      profileStore.add({
        id: 'legacy-profile',
        name: '舊玩家',
        normalizedName: '舊玩家',
        createdAt: '2026-10-01T00:00:00.000Z'
      });
      request.transaction?.objectStore(SETTINGS_STORE).add({ id: 'parent-security', value: 'kept' });
    };
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(
        [RESULT_STORE, PROFILE_STORE, SETTINGS_STORE],
        'readonly'
      );
      transaction.oncomplete = () => {
        database.close();
        resolve();
      };
      transaction.onerror = () => reject(transaction.error ?? new Error('無法建立 v3 測試資料庫'));
    };
    request.onerror = () => reject(request.error ?? new Error('無法建立 v3 測試資料庫'));
  });
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

describe('persistent result repository', () => {
  beforeEach(deleteTestDatabase);
  afterEach(deleteTestDatabase);

  it('writes the result, XP event and profile progress atomically', async () => {
    const saved = await resultRepository.save(persistentResult());
    const snapshot = await persistentStoreSnapshot();

    expect(saved).toMatchObject({ duplicate: false, experience: { totalXp: 40 } });
    expect(snapshot.results).toHaveLength(1);
    expect(snapshot.events).toHaveLength(1);
    expect(snapshot.experience).toMatchObject({
      profileId: 'persistent-profile',
      totalXp: 40,
      rankId: 'chicken'
    });
  });

  it('does not add XP or records again for the same event', async () => {
    const result = persistentResult();
    await resultRepository.save(result);
    const duplicate = await resultRepository.save(result);
    const snapshot = await persistentStoreSnapshot();

    expect(duplicate).toMatchObject({ duplicate: true, experience: { totalXp: 40 } });
    expect(snapshot.results).toHaveLength(1);
    expect(snapshot.events).toHaveLength(1);
    expect(snapshot.experience).toMatchObject({ totalXp: 40 });
  });

  it('rolls back the XP event and progress when a write fails midway', async () => {
    const original = persistentResult();
    const database = await openDatabase();
    try {
      const transaction = database.transaction(RESULT_STORE, 'readwrite');
      transaction.objectStore(RESULT_STORE).add(original);
      await transactionDone(transaction);
    } finally {
      database.close();
    }

    await expect(resultRepository.save(original)).rejects.toThrow();

    const snapshot = await persistentStoreSnapshot();
    expect(snapshot.results).toHaveLength(1);
    expect(snapshot.events).toEqual([]);
    expect(snapshot.experience).toBeUndefined();
  });

  it('upgrades v3 without changing existing profiles, results or settings', async () => {
    await createVersionThreeDatabase();
    const database = await openDatabase();
    try {
      expect(Array.from(database.objectStoreNames)).toEqual(expect.arrayContaining([
        RESULT_STORE,
        PROFILE_STORE,
        SETTINGS_STORE,
        EXPERIENCE_STORE,
        XP_EVENT_STORE
      ]));
      const transaction = database.transaction(
        [RESULT_STORE, PROFILE_STORE, SETTINGS_STORE, EXPERIENCE_STORE, XP_EVENT_STORE],
        'readonly'
      );
      const [legacyResult, legacyProfile, legacySetting, progress, events] = await Promise.all([
        requestResult(transaction.objectStore(RESULT_STORE).get('legacy-result')),
        requestResult(transaction.objectStore(PROFILE_STORE).get('legacy-profile')),
        requestResult(transaction.objectStore(SETTINGS_STORE).get('parent-security')),
        requestResult(transaction.objectStore(EXPERIENCE_STORE).get('legacy-profile')),
        requestResult(transaction.objectStore(XP_EVENT_STORE).getAll())
      ]);
      await transactionDone(transaction);

      expect(legacyResult).toMatchObject({ id: 'legacy-result', score: 900 });
      expect(legacyProfile).toMatchObject({ id: 'legacy-profile', name: '舊玩家' });
      expect(legacySetting).toEqual({ id: 'parent-security', value: 'kept' });
      expect(progress).toBeUndefined();
      expect(events).toEqual([]);
    } finally {
      database.close();
    }
  });
});
