import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FIRST_CAMPAIGN_ID } from '../game/campaignConfig';
import type { CampaignCompletionInput } from '../game/campaignTypes';
import {
  CAMPAIGN_CHAPTER_PROGRESS_STORE,
  CAMPAIGN_CONTENT_FLAG_STORE,
  CAMPAIGN_LEVEL_PROGRESS_STORE,
  CAMPAIGN_RESULT_STORE,
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
import { GUEST_PROFILE_ID, profileRepository } from './profileRepository';
import { resultRepository } from './resultsRepository';
import {
  campaignChapterProgressId,
  campaignRepository,
  campaignXpEventId
} from './campaignRepository';

const PROFILE_ID = 'campaign-player';
const STARTED_AT = '2026-10-12T01:00:00.000Z';

function completion(
  resultId: string,
  stars: 1 | 2 | 3,
  overrides: Partial<CampaignCompletionInput> = {}
): CampaignCompletionInput {
  return {
    resultId,
    profileId: PROFILE_ID,
    campaignId: FIRST_CAMPAIGN_ID,
    levelId: 'level-01',
    gameplayId: 'sequence-lock',
    stars,
    performance: { kind: 'sequence-lock', wrongSequenceCount: 0 },
    durationMs: 30_000,
    playedAt: '2026-10-12T01:05:00.000Z',
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

async function persistentSnapshot(profileId = PROFILE_ID) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(
      [
        CAMPAIGN_RESULT_STORE,
        CAMPAIGN_LEVEL_PROGRESS_STORE,
        CAMPAIGN_CHAPTER_PROGRESS_STORE,
        CAMPAIGN_CONTENT_FLAG_STORE,
        EXPERIENCE_STORE,
        XP_EVENT_STORE
      ],
      'readonly'
    );
    const done = transactionDone(transaction);
    const [results, levels, chapters, flags, experience, events] = await Promise.all([
      requestResult(transaction.objectStore(CAMPAIGN_RESULT_STORE).index('profileId').getAll(profileId)),
      requestResult(transaction.objectStore(CAMPAIGN_LEVEL_PROGRESS_STORE).index('profileId').getAll(profileId)),
      requestResult(transaction.objectStore(CAMPAIGN_CHAPTER_PROGRESS_STORE).index('profileId').getAll(profileId)),
      requestResult(transaction.objectStore(CAMPAIGN_CONTENT_FLAG_STORE).index('profileId').getAll(profileId)),
      requestResult(transaction.objectStore(EXPERIENCE_STORE).get(profileId)),
      requestResult(transaction.objectStore(XP_EVENT_STORE).index('profileId').getAll(profileId))
    ]);
    await done;
    return { results, levels, chapters, flags, experience, events };
  } finally {
    database.close();
  }
}

describe('persistent campaign repository', () => {
  beforeEach(deleteTestDatabase);
  afterEach(deleteTestDatabase);

  it('starts the first chapter idempotently and records the intro flag', async () => {
    await campaignRepository.startCampaign(PROFILE_ID, FIRST_CAMPAIGN_ID, STARTED_AT);
    await campaignRepository.startCampaign(PROFILE_ID, FIRST_CAMPAIGN_ID, STARTED_AT);
    const snapshot = await campaignRepository.loadCampaign(PROFILE_ID, FIRST_CAMPAIGN_ID);

    expect(snapshot.chapter).toMatchObject({
      id: campaignChapterProgressId(PROFILE_ID, FIRST_CAMPAIGN_ID),
      revision: 1
    });
    expect(snapshot.levels).toHaveLength(1);
    expect(snapshot.levels[0]).toMatchObject({ levelId: 'level-01', bestStars: 0 });
    expect(snapshot.flags).toEqual([
      expect.objectContaining({ flagType: 'chapter-intro', contentId: FIRST_CAMPAIGN_ID })
    ]);
  });

  it('records level entry and a tutorial flag without saving an in-progress run', async () => {
    await campaignRepository.startCampaign(PROFILE_ID, FIRST_CAMPAIGN_ID, STARTED_AT);
    await campaignRepository.enterLevel(
      PROFILE_ID,
      FIRST_CAMPAIGN_ID,
      'level-01',
      '2026-10-12T01:01:00.000Z',
      'sequence-lock-basic'
    );
    const snapshot = await persistentSnapshot();

    expect(snapshot.results).toEqual([]);
    expect(snapshot.chapters).toEqual([
      expect.objectContaining({ recentLevelId: 'level-01', revision: 2 })
    ]);
    expect(snapshot.flags).toHaveLength(2);
  });

  it('awards 50 XP through four events for a first three-star clear', async () => {
    await campaignRepository.startCampaign(PROFILE_ID, FIRST_CAMPAIGN_ID, STARTED_AT);
    const saved = await campaignRepository.completeLevel(completion('first-three-star', 3));
    const snapshot = await persistentSnapshot();

    expect(saved).toMatchObject({ duplicate: false, experience: { totalXp: 50 } });
    expect(saved.result.xpAwarded).toBe(50);
    expect(saved.result.xpEventIds).toHaveLength(4);
    expect(snapshot.results).toHaveLength(1);
    expect(snapshot.events).toHaveLength(4);
    expect(snapshot.experience).toMatchObject({ totalXp: 50 });
    expect(snapshot.levels).toEqual(expect.arrayContaining([
      expect.objectContaining({ levelId: 'level-01', bestStars: 3 }),
      expect.objectContaining({ levelId: 'level-02', bestStars: 0 })
    ]));
  });

  it('only awards missing star milestones when a best result improves', async () => {
    await campaignRepository.startCampaign(PROFILE_ID, FIRST_CAMPAIGN_ID, STARTED_AT);
    await campaignRepository.completeLevel(completion('one-star', 1));
    const saved = await campaignRepository.completeLevel(completion('three-star', 3, {
      playedAt: '2026-10-12T01:10:00.000Z'
    }));

    expect(saved.result.xpAwarded).toBe(20);
    expect(saved.result.xpEventIds).toEqual([
      campaignXpEventId(PROFILE_ID, FIRST_CAMPAIGN_ID, 'level-01', 'star-2'),
      campaignXpEventId(PROFILE_ID, FIRST_CAMPAIGN_ID, 'level-01', 'star-3')
    ]);
    expect(saved.experience.totalXp).toBe(50);
  });

  it('awards 10 XP for each later three-star replay', async () => {
    await campaignRepository.startCampaign(PROFILE_ID, FIRST_CAMPAIGN_ID, STARTED_AT);
    await campaignRepository.completeLevel(completion('initial-three-star', 3));
    const replay = await campaignRepository.completeLevel(completion('replay-three-star', 3, {
      playedAt: '2026-10-12T01:15:00.000Z'
    }));

    expect(replay.result.xpAwarded).toBe(10);
    expect(replay.result.xpEventIds).toEqual([
      campaignXpEventId(
        PROFILE_ID,
        FIRST_CAMPAIGN_ID,
        'level-01',
        'replay-three-star',
        'replay-three-star'
      )
    ]);
    expect(replay.experience.totalXp).toBe(60);
  });

  it('returns a duplicate save without adding XP or records', async () => {
    await campaignRepository.startCampaign(PROFILE_ID, FIRST_CAMPAIGN_ID, STARTED_AT);
    const input = completion('retry-result', 3);
    await campaignRepository.completeLevel(input);
    const duplicate = await campaignRepository.completeLevel(input);
    const snapshot = await persistentSnapshot();

    expect(duplicate).toMatchObject({ duplicate: true, experience: { totalXp: 50 } });
    expect(snapshot.results).toHaveLength(1);
    expect(snapshot.events).toHaveLength(4);
  });

  it('rejects a reused result ID with different content and rolls back all writes', async () => {
    await campaignRepository.startCampaign(PROFILE_ID, FIRST_CAMPAIGN_ID, STARTED_AT);
    const input = completion('collision', 1);
    await campaignRepository.completeLevel(input);

    await expect(campaignRepository.completeLevel({
      ...input,
      stars: 2
    })).rejects.toThrow('不一致');

    const snapshot = await persistentSnapshot();
    expect(snapshot.results).toHaveLength(1);
    expect(snapshot.events).toHaveLength(2);
    expect(snapshot.experience).toMatchObject({ totalXp: 30 });
  });

  it('rolls back result and progress when an XP event ID has conflicting content', async () => {
    await campaignRepository.startCampaign(PROFILE_ID, FIRST_CAMPAIGN_ID, STARTED_AT);
    const database = await openDatabase();
    try {
      const transaction = database.transaction(XP_EVENT_STORE, 'readwrite');
      transaction.objectStore(XP_EVENT_STORE).add({
        eventId: campaignXpEventId(PROFILE_ID, FIRST_CAMPAIGN_ID, 'level-01', 'clear'),
        profileId: PROFILE_ID,
        sourceType: 'campaign',
        resultId: 'corrupt-result',
        campaignId: FIRST_CAMPAIGN_ID,
        levelId: 'level-01',
        rewardKind: 'clear',
        xpAwarded: 999,
        previousRankId: 'chicken',
        rankId: 'chicken',
        createdAt: STARTED_AT
      });
      await transactionDone(transaction);
    } finally {
      database.close();
    }

    await expect(campaignRepository.completeLevel(completion('must-rollback', 1)))
      .rejects.toThrow('不一致');

    const snapshot = await persistentSnapshot();
    expect(snapshot.results).toEqual([]);
    expect(snapshot.levels).toEqual([
      expect.objectContaining({ levelId: 'level-01', bestStars: 0 })
    ]);
    expect(snapshot.experience).toBeUndefined();
  });

  it('marks the chapter complete without a separate chapter XP reward', async () => {
    await campaignRepository.startCampaign(PROFILE_ID, FIRST_CAMPAIGN_ID, STARTED_AT);
    const gameplayIds = [
      'sequence-lock', 'sound-maze', 'memory-explore', 'escort', 'zhuyin-battle',
      'chase', 'sound-maze', 'sequence-lock', 'zhuyin-battle', 'memory-battle', 'boss-battle'
    ] as const;
    for (let index = 0; index < gameplayIds.length; index += 1) {
      const levelNumber = String(index + 1).padStart(2, '0');
      const gameplayId = gameplayIds[index];
      const performance = gameplayId === 'sequence-lock'
        ? { kind: 'sequence-lock' as const, wrongSequenceCount: 0 }
        : gameplayId === 'sound-maze'
          ? { kind: 'maze' as const, wrongRouteCount: 0 }
          : gameplayId === 'memory-explore'
            ? { kind: 'memory-explore' as const, wrongPairCount: 0 }
            : gameplayId === 'escort' || gameplayId === 'chase'
              ? { kind: 'pursuit' as const, finalSafetyDistance: 3, maxSuccessStreak: 4 }
              : { kind: 'battle' as const, remainingLives: 3 };
      await campaignRepository.completeLevel(completion(`result-${levelNumber}`, 1, {
        levelId: `level-${levelNumber}`,
        gameplayId,
        performance,
        playedAt: `2026-10-12T02:${levelNumber}:00.000Z`
      }));
    }
    const snapshot = await persistentSnapshot();

    expect(snapshot.chapters).toEqual([
      expect.objectContaining({ completedAt: '2026-10-12T02:11:00.000Z' })
    ]);
    expect(snapshot.events).toHaveLength(22);
    expect(snapshot.experience).toMatchObject({ totalXp: 330 });
  });
});

describe('guest campaign repository', () => {
  beforeEach(() => campaignRepository.clearGuestSession());
  afterEach(() => campaignRepository.clearGuestSession());

  it('shares guest XP with the existing experience view without IndexedDB writes', async () => {
    await campaignRepository.startCampaign(GUEST_PROFILE_ID, FIRST_CAMPAIGN_ID, STARTED_AT);
    const saved = await campaignRepository.completeLevel(completion('guest-clear', 3, {
      profileId: GUEST_PROFILE_ID
    }));

    expect(saved.experience.totalXp).toBe(50);
    await expect(resultRepository.experience(GUEST_PROFILE_ID))
      .resolves.toMatchObject({ totalXp: 50 });

    const database = await openDatabase();
    try {
      const transaction = database.transaction(CAMPAIGN_RESULT_STORE, 'readonly');
      expect(await requestResult(transaction.objectStore(CAMPAIGN_RESULT_STORE).getAll())).toEqual([]);
    } finally {
      database.close();
    }
  });

  it('clears chapter, results and XP together when the guest session ends', async () => {
    await campaignRepository.startCampaign(GUEST_PROFILE_ID, FIRST_CAMPAIGN_ID, STARTED_AT);
    await campaignRepository.completeLevel(completion('guest-temporary', 1, {
      profileId: GUEST_PROFILE_ID
    }));
    campaignRepository.clearGuestSession();

    await expect(campaignRepository.loadCampaign(GUEST_PROFILE_ID, FIRST_CAMPAIGN_ID))
      .resolves.toEqual({ chapter: null, levels: [], flags: [] });
    await expect(resultRepository.experience(GUEST_PROFILE_ID))
      .resolves.toMatchObject({ totalXp: 0 });
  });
});

describe('campaign database migration', () => {
  beforeEach(deleteTestDatabase);
  afterEach(deleteTestDatabase);

  it('adds v5 stores while preserving v4 data', async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 4);
      request.onupgradeneeded = () => {
        const database = request.result;
        const resultStore = database.createObjectStore(RESULT_STORE, { keyPath: 'id' });
        resultStore.createIndex('profileId', 'profileId', { unique: false });
        const profileStore = database.createObjectStore(PROFILE_STORE, { keyPath: 'id' });
        profileStore.createIndex('normalizedName', 'normalizedName', { unique: true });
        database.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
        database.createObjectStore(EXPERIENCE_STORE, { keyPath: 'profileId' });
        const eventStore = database.createObjectStore(XP_EVENT_STORE, { keyPath: 'eventId' });
        eventStore.createIndex('profileId', 'profileId', { unique: false });
        profileStore.add({ id: 'legacy-profile', normalizedName: 'legacy', name: 'Legacy' });
        resultStore.add({ id: 'legacy-result', profileId: 'legacy-profile' });
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error ?? new Error('無法建立 v4 測試資料庫'));
    });

    const database = await openDatabase();
    try {
      expect(Array.from(database.objectStoreNames)).toEqual(expect.arrayContaining([
        CAMPAIGN_RESULT_STORE,
        CAMPAIGN_LEVEL_PROGRESS_STORE,
        CAMPAIGN_CHAPTER_PROGRESS_STORE,
        CAMPAIGN_CONTENT_FLAG_STORE
      ]));
      const transaction = database.transaction([PROFILE_STORE, RESULT_STORE], 'readonly');
      expect(await requestResult(transaction.objectStore(PROFILE_STORE).get('legacy-profile')))
        .toMatchObject({ name: 'Legacy' });
      expect(await requestResult(transaction.objectStore(RESULT_STORE).get('legacy-result')))
        .toMatchObject({ profileId: 'legacy-profile' });
    } finally {
      database.close();
    }
  });

  it('purges every campaign store with an expired player account', async () => {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(
        [
          PROFILE_STORE,
          RESULT_STORE,
          EXPERIENCE_STORE,
          XP_EVENT_STORE,
          CAMPAIGN_RESULT_STORE,
          CAMPAIGN_LEVEL_PROGRESS_STORE,
          CAMPAIGN_CHAPTER_PROGRESS_STORE,
          CAMPAIGN_CONTENT_FLAG_STORE
        ],
        'readwrite'
      );
      transaction.objectStore(PROFILE_STORE).add({
        id: PROFILE_ID,
        name: '待刪除玩家',
        normalizedName: '待刪除玩家',
        scheduledDeletionAt: '2020-01-01T00:00:00.000Z'
      });
      transaction.objectStore(RESULT_STORE).add({ id: 'old-result', profileId: PROFILE_ID });
      transaction.objectStore(EXPERIENCE_STORE).add({ profileId: PROFILE_ID, totalXp: 30 });
      transaction.objectStore(XP_EVENT_STORE).add({ eventId: 'old-event', profileId: PROFILE_ID });
      transaction.objectStore(CAMPAIGN_RESULT_STORE).add({ id: 'campaign-result', profileId: PROFILE_ID });
      transaction.objectStore(CAMPAIGN_LEVEL_PROGRESS_STORE).add({
        id: 'campaign-level', profileId: PROFILE_ID
      });
      transaction.objectStore(CAMPAIGN_CHAPTER_PROGRESS_STORE).add({
        id: 'campaign-chapter', profileId: PROFILE_ID
      });
      transaction.objectStore(CAMPAIGN_CONTENT_FLAG_STORE).add({
        id: 'campaign-flag', profileId: PROFILE_ID
      });
      await transactionDone(transaction);
    } finally {
      database.close();
    }

    await profileRepository.list();
    const snapshot = await persistentSnapshot();

    expect(snapshot.results).toEqual([]);
    expect(snapshot.levels).toEqual([]);
    expect(snapshot.chapters).toEqual([]);
    expect(snapshot.flags).toEqual([]);
    expect(snapshot.events).toEqual([]);
    expect(snapshot.experience).toBeUndefined();
  });
});
