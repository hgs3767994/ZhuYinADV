import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FIRST_CAMPAIGN_ID } from '../game/campaignConfig';
import {
  battleStars,
  createBossBattle,
  createLevelFiveBattle,
  createLevelNineBattle,
  normalBattleAttack
} from '../game/battle';
import { saveCampaignCompletionWithRetry } from '../game/campaignSave';
import type { CampaignCompletionInput } from '../game/campaignTypes';
import {
  createMemoryBattlePlan,
  createMemoryExplorePlan,
  memoryBattleStars,
  memoryExplorePairMatches,
  memoryExploreStars,
  replaceAndReshuffleMemoryGroup,
  type MemoryExploreLayout
} from '../game/memoryExplore';
import {
  createLevelFourEscort,
  createLevelSixChase,
  initialPursuitState,
  pursuitStars,
  resolvePursuitSegment
} from '../game/pursuit';
import {
  createLevelEightSequenceLockPuzzles,
  createSequenceLockPuzzles,
  sequenceLockMatches,
  sequenceLockStars,
  type RandomSource
} from '../game/sequenceLock';
import { createLevelSevenSoundMaze, createLevelTwoSoundMaze, soundMazeStars } from '../game/soundMaze';
import {
  CAMPAIGN_RESULT_STORE,
  DATABASE_NAME,
  openDatabase,
  requestResult,
  XP_EVENT_STORE
} from './database';
import { campaignRepository } from './campaignRepository';
import { GUEST_PROFILE_ID, profileRepository } from './profileRepository';
import { resultRepository } from './resultsRepository';

class DeterministicRandom implements RandomSource {
  private index = 0;
  constructor(private readonly values: readonly number[]) {}
  next(): number {
    const value = this.values[this.index % this.values.length] ?? 0;
    this.index += 1;
    return value;
  }
}

function deleteTestDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('無法刪除測試資料庫'));
    request.onblocked = () => reject(new Error('測試資料庫仍被開啟'));
  });
}

async function storedCampaignCounts(profileId: string) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction([CAMPAIGN_RESULT_STORE, XP_EVENT_STORE], 'readonly');
    const [results, events] = await Promise.all([
      requestResult(transaction.objectStore(CAMPAIGN_RESULT_STORE).index('profileId').getAll(profileId)),
      requestResult(transaction.objectStore(XP_EVENT_STORE).index('profileId').getAll(profileId))
    ]);
    return { results: results.length, events: events.length };
  } finally {
    database.close();
  }
}

function solveRun(resultId: string, wrongSequenceCount = 0) {
  const puzzles = createSequenceLockPuzzles(
    resultId,
    new DeterministicRandom([0.13, 0.77, 0.41, 0.92, 0.28])
  );
  for (const puzzle of puzzles) {
    const slots = puzzle.targetSymbols.map((symbol) =>
      puzzle.cards.find((card) => card.symbol === symbol)!.id
    );
    expect(sequenceLockMatches(puzzle, slots)).toBe(true);
  }
  return {
    stars: sequenceLockStars(wrongSequenceCount),
    wrongSequenceCount
  };
}

function completion(
  profileId: string,
  resultId: string,
  playedAt: string,
  wrongSequenceCount = 0
): CampaignCompletionInput {
  const solved = solveRun(resultId, wrongSequenceCount);
  return {
    resultId,
    profileId,
    campaignId: FIRST_CAMPAIGN_ID,
    levelId: 'level-01',
    gameplayId: 'sequence-lock',
    stars: solved.stars,
    performance: { kind: 'sequence-lock', wrongSequenceCount: solved.wrongSequenceCount },
    durationMs: 42_000,
    playedAt,
    appVersion: 'e2e-test'
  };
}

describe('level one end-to-end data flow', () => {
  beforeEach(async () => {
    campaignRepository.clearGuestSession();
    await deleteTestDatabase();
  });
  afterEach(async () => {
    campaignRepository.clearGuestSession();
    await deleteTestDatabase();
  });

  it('persists a formal-account clear, safely retries, reloads progress and deduplicates the same result', async () => {
    const profile = await profileRepository.create('闖關整合測試', '1234');
    await campaignRepository.startCampaign(profile.id, FIRST_CAMPAIGN_ID, '2026-10-12T03:00:00.000Z');
    await campaignRepository.enterLevel(
      profile.id,
      FIRST_CAMPAIGN_ID,
      'level-01',
      '2026-10-12T03:01:00.000Z',
      'sequence-lock-basic'
    );
    expect(await storedCampaignCounts(profile.id)).toEqual({ results: 0, events: 0 });

    const input = completion(profile.id, 'level-01-run-001', '2026-10-12T03:05:00.000Z');
    const attemptedInputs: CampaignCompletionInput[] = [];
    let firstAttempt = true;
    const saved = await saveCampaignCompletionWithRetry(input, async (sameInput) => {
      attemptedInputs.push(sameInput);
      if (firstAttempt) {
        firstAttempt = false;
        throw new Error('simulated temporary storage failure');
      }
      return campaignRepository.completeLevel(sameInput);
    }, { attempts: 2, wait: async () => undefined });

    expect(attemptedInputs).toEqual([input, input]);
    expect(saved).toMatchObject({ duplicate: false, experience: { totalXp: 50 } });
    expect(saved.result).toMatchObject({
      id: 'level-01-run-001',
      stars: 3,
      xpAwarded: 50,
      performance: { kind: 'sequence-lock', wrongSequenceCount: 0 }
    });

    const reloaded = await campaignRepository.loadCampaign(profile.id, FIRST_CAMPAIGN_ID);
    expect(reloaded.levels).toEqual(expect.arrayContaining([
      expect.objectContaining({ levelId: 'level-01', bestStars: 3, bestResultId: input.resultId }),
      expect.objectContaining({ levelId: 'level-02', bestStars: 0 })
    ]));
    await expect(resultRepository.experience(profile.id)).resolves.toMatchObject({ totalXp: 50 });
    expect(await storedCampaignCounts(profile.id)).toEqual({ results: 1, events: 4 });

    const duplicate = await campaignRepository.completeLevel(input);
    expect(duplicate).toMatchObject({ duplicate: true, experience: { totalXp: 50 } });
    expect(await storedCampaignCounts(profile.id)).toEqual({ results: 1, events: 4 });
  });

  it('gives each later three-star run 10 XP while a weaker replay gives none', async () => {
    const profile = await profileRepository.create('三星重玩整合測試', '1234');
    await campaignRepository.startCampaign(profile.id, FIRST_CAMPAIGN_ID, '2026-10-12T04:00:00.000Z');
    await campaignRepository.completeLevel(completion(
      profile.id,
      'three-star-initial',
      '2026-10-12T04:05:00.000Z'
    ));
    const weaker = await campaignRepository.completeLevel(completion(
      profile.id,
      'two-star-replay',
      '2026-10-12T04:10:00.000Z',
      2
    ));
    const replay = await campaignRepository.completeLevel(completion(
      profile.id,
      'three-star-replay',
      '2026-10-12T04:15:00.000Z'
    ));

    expect(weaker.result.xpAwarded).toBe(0);
    expect(replay.result.xpAwarded).toBe(10);
    expect(replay.experience.totalXp).toBe(60);
    expect(await storedCampaignCounts(profile.id)).toEqual({ results: 3, events: 5 });
  });

  it('carries a completed level-two maze into progress, XP and level-three unlock', async () => {
    const profile = await profileRepository.create('迷宮整合測試', '1234');
    await campaignRepository.startCampaign(profile.id, FIRST_CAMPAIGN_ID, '2026-10-12T04:30:00.000Z');
    await campaignRepository.completeLevel(completion(
      profile.id,
      'maze-prerequisite',
      '2026-10-12T04:31:00.000Z'
    ));

    const resultId = 'level-02-maze-run';
    const nodes = createLevelTwoSoundMaze(resultId, new DeterministicRandom([0.2, 0.9, 0.4]));
    expect(nodes).toHaveLength(5);
    expect(nodes.filter((node) => node.fragment)).toHaveLength(3);
    const input: CampaignCompletionInput = {
      resultId,
      profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-02',
      gameplayId: 'sound-maze',
      stars: soundMazeStars(2),
      performance: { kind: 'maze', wrongRouteCount: 2 },
      durationMs: 58_000,
      playedAt: '2026-10-12T04:35:00.000Z',
      appVersion: 'e2e-test'
    };
    const saved = await campaignRepository.completeLevel(input);

    expect(saved.result).toMatchObject({
      id: resultId,
      gameplayId: 'sound-maze',
      stars: 2,
      performance: { kind: 'maze', wrongRouteCount: 2 },
      xpAwarded: 40
    });
    expect(saved.experience.totalXp).toBe(90);
    expect(saved.snapshot.levels).toEqual(expect.arrayContaining([
      expect.objectContaining({ levelId: 'level-02', bestStars: 2, bestResultId: resultId }),
      expect.objectContaining({ levelId: 'level-03', bestStars: 0 })
    ]));
  });

  it('persists all five level-three groups and unlocks the escort level atomically', async () => {
    const profile = await profileRepository.create('翻卡整合測試', '1234');
    await campaignRepository.startCampaign(profile.id, FIRST_CAMPAIGN_ID, '2026-10-12T04:40:00.000Z');
    await campaignRepository.completeLevel(completion(
      profile.id,
      'memory-level-one-prerequisite',
      '2026-10-12T04:41:00.000Z'
    ));
    await campaignRepository.completeLevel({
      resultId: 'memory-level-two-prerequisite',
      profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-02',
      gameplayId: 'sound-maze',
      stars: 3,
      performance: { kind: 'maze', wrongRouteCount: 0 },
      durationMs: 51_000,
      playedAt: '2026-10-12T04:42:00.000Z',
      appVersion: 'e2e-test'
    });

    const resultId = 'level-03-memory-run';
    const plan = createMemoryExplorePlan(resultId, new DeterministicRandom([0.12, 0.91, 0.37, 0.66]));
    let layout: MemoryExploreLayout = plan.cards;
    plan.targetSymbols.forEach((target, index) => {
      const matchingIds = layout.filter((card) => card.symbol === target).map((card) => card.id);
      expect(memoryExplorePairMatches(layout, matchingIds.slice(0, 2), target)).toBe(true);
      if (index + 1 < plan.targetSymbols.length) {
        layout = replaceAndReshuffleMemoryGroup(
          layout,
          target,
          plan.replacementSymbols[index],
          plan.id,
          index,
          new DeterministicRandom([0.25, 0.75])
        );
      }
    });

    const wrongPairCount = 2;
    const input: CampaignCompletionInput = {
      resultId,
      profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-03',
      gameplayId: 'memory-explore',
      stars: memoryExploreStars(wrongPairCount),
      performance: { kind: 'memory-explore', wrongPairCount },
      durationMs: 96_000,
      playedAt: '2026-10-12T04:45:00.000Z',
      appVersion: 'e2e-test'
    };
    const saved = await campaignRepository.completeLevel(input);

    expect(saved.result).toMatchObject({
      id: resultId,
      gameplayId: 'memory-explore',
      stars: 3,
      performance: { kind: 'memory-explore', wrongPairCount: 2 },
      xpAwarded: 50
    });
    expect(saved.experience.totalXp).toBe(150);
    expect(saved.snapshot.levels).toEqual(expect.arrayContaining([
      expect.objectContaining({ levelId: 'level-03', bestStars: 3, bestResultId: resultId }),
      expect.objectContaining({ levelId: 'level-04', bestStars: 0 })
    ]));
    expect(await storedCampaignCounts(profile.id)).toEqual({ results: 3, events: 12 });
  });

  it('persists a ten-segment escort result and unlocks the first battle atomically', async () => {
    const profile = await profileRepository.create('護送整合測試', '1234');
    await campaignRepository.startCampaign(profile.id, FIRST_CAMPAIGN_ID, '2026-10-12T04:50:00.000Z');
    await campaignRepository.completeLevel(completion(
      profile.id,
      'escort-level-one-prerequisite',
      '2026-10-12T04:51:00.000Z'
    ));
    await campaignRepository.completeLevel({
      resultId: 'escort-level-two-prerequisite',
      profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-02',
      gameplayId: 'sound-maze',
      stars: 3,
      performance: { kind: 'maze', wrongRouteCount: 0 },
      durationMs: 50_000,
      playedAt: '2026-10-12T04:52:00.000Z',
      appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'escort-level-three-prerequisite',
      profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-03',
      gameplayId: 'memory-explore',
      stars: 3,
      performance: { kind: 'memory-explore', wrongPairCount: 0 },
      durationMs: 85_000,
      playedAt: '2026-10-12T04:53:00.000Z',
      appVersion: 'e2e-test'
    });

    const resultId = 'level-04-escort-run';
    const segments = createLevelFourEscort(resultId, new DeterministicRandom([0.18, 0.73, 0.42]));
    let state = initialPursuitState();
    for (const segment of segments) {
      expect(segment.roads.find((road) => road.correct)?.symbol).toBe(segment.targetSymbol);
      state = resolvePursuitSegment(state, true);
    }
    expect(state).toMatchObject({ safetyDistance: 5, successStreak: 10, maxSuccessStreak: 10 });

    const input: CampaignCompletionInput = {
      resultId,
      profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-04',
      gameplayId: 'escort',
      stars: pursuitStars(state.safetyDistance),
      performance: {
        kind: 'pursuit',
        finalSafetyDistance: state.safetyDistance,
        maxSuccessStreak: state.maxSuccessStreak
      },
      durationMs: 64_000,
      playedAt: '2026-10-12T04:55:00.000Z',
      appVersion: 'e2e-test'
    };
    const saved = await campaignRepository.completeLevel(input);

    expect(saved.result).toMatchObject({
      id: resultId,
      gameplayId: 'escort',
      stars: 3,
      performance: { kind: 'pursuit', finalSafetyDistance: 5, maxSuccessStreak: 10 },
      xpAwarded: 50
    });
    expect(saved.experience.totalXp).toBe(200);
    expect(saved.snapshot.levels).toEqual(expect.arrayContaining([
      expect.objectContaining({ levelId: 'level-04', bestStars: 3, bestResultId: resultId }),
      expect.objectContaining({ levelId: 'level-05', bestStars: 0 })
    ]));
    expect(await storedCampaignCounts(profile.id)).toEqual({ results: 4, events: 16 });
  });

  it('persists all five battle waves and unlocks level six atomically', async () => {
    const profile = await profileRepository.create('戰鬥整合測試', '1234');
    await campaignRepository.startCampaign(profile.id, FIRST_CAMPAIGN_ID, '2026-10-12T05:10:00.000Z');
    await campaignRepository.completeLevel(completion(
      profile.id,
      'battle-level-one-prerequisite',
      '2026-10-12T05:11:00.000Z'
    ));
    await campaignRepository.completeLevel({
      resultId: 'battle-level-two-prerequisite',
      profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-02',
      gameplayId: 'sound-maze',
      stars: 3,
      performance: { kind: 'maze', wrongRouteCount: 0 },
      durationMs: 50_000,
      playedAt: '2026-10-12T05:12:00.000Z',
      appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'battle-level-three-prerequisite',
      profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-03',
      gameplayId: 'memory-explore',
      stars: 3,
      performance: { kind: 'memory-explore', wrongPairCount: 0 },
      durationMs: 85_000,
      playedAt: '2026-10-12T05:13:00.000Z',
      appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'battle-level-four-prerequisite',
      profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-04',
      gameplayId: 'escort',
      stars: 3,
      performance: { kind: 'pursuit', finalSafetyDistance: 5, maxSuccessStreak: 10 },
      durationMs: 62_000,
      playedAt: '2026-10-12T05:14:00.000Z',
      appVersion: 'e2e-test'
    });

    const resultId = 'level-05-battle-run';
    const plan = createLevelFiveBattle(resultId, new DeterministicRandom([0.17, 0.82, 0.36, 0.68]));
    expect(plan.waves.map((wave) => wave.length)).toEqual([1, 1, 2, 1, 2]);
    for (const wave of plan.waves) {
      for (const enemy of wave) {
        expect(normalBattleAttack(normalBattleAttack(enemy))).toMatchObject({ life: 0, shield: 0 });
      }
    }

    const remainingLives = 5;
    const input: CampaignCompletionInput = {
      resultId,
      profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-05',
      gameplayId: 'zhuyin-battle',
      stars: battleStars(remainingLives),
      performance: { kind: 'battle', remainingLives },
      durationMs: 78_000,
      playedAt: '2026-10-12T05:15:00.000Z',
      appVersion: 'e2e-test'
    };
    const saved = await campaignRepository.completeLevel(input);

    expect(saved.result).toMatchObject({
      id: resultId,
      gameplayId: 'zhuyin-battle',
      stars: 3,
      performance: { kind: 'battle', remainingLives: 5 },
      xpAwarded: 50
    });
    expect(saved.experience.totalXp).toBe(250);
    expect(saved.snapshot.levels).toEqual(expect.arrayContaining([
      expect.objectContaining({ levelId: 'level-05', bestStars: 3, bestResultId: resultId }),
      expect.objectContaining({ levelId: 'level-06', bestStars: 0 })
    ]));
    expect(await storedCampaignCounts(profile.id)).toEqual({ results: 5, events: 20 });
  });

  it('persists a ten-segment chase result and unlocks the underground passage atomically', async () => {
    const profile = await profileRepository.create('追逐整合測試', '1234');
    await campaignRepository.startCampaign(profile.id, FIRST_CAMPAIGN_ID, '2026-10-12T05:20:00.000Z');
    await campaignRepository.completeLevel(completion(
      profile.id,
      'chase-level-one-prerequisite',
      '2026-10-12T05:21:00.000Z'
    ));
    await campaignRepository.completeLevel({
      resultId: 'chase-level-two-prerequisite',
      profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-02',
      gameplayId: 'sound-maze',
      stars: 3,
      performance: { kind: 'maze', wrongRouteCount: 0 },
      durationMs: 50_000,
      playedAt: '2026-10-12T05:22:00.000Z',
      appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'chase-level-three-prerequisite',
      profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-03',
      gameplayId: 'memory-explore',
      stars: 3,
      performance: { kind: 'memory-explore', wrongPairCount: 0 },
      durationMs: 85_000,
      playedAt: '2026-10-12T05:23:00.000Z',
      appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'chase-level-four-prerequisite',
      profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-04',
      gameplayId: 'escort',
      stars: 3,
      performance: { kind: 'pursuit', finalSafetyDistance: 5, maxSuccessStreak: 10 },
      durationMs: 62_000,
      playedAt: '2026-10-12T05:24:00.000Z',
      appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'chase-level-five-prerequisite',
      profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-05',
      gameplayId: 'zhuyin-battle',
      stars: 3,
      performance: { kind: 'battle', remainingLives: 5 },
      durationMs: 78_000,
      playedAt: '2026-10-12T05:25:00.000Z',
      appVersion: 'e2e-test'
    });

    const resultId = 'level-06-chase-run';
    const segments = createLevelSixChase(resultId, new DeterministicRandom([0.19, 0.76, 0.43]));
    expect(segments).toHaveLength(10);
    expect(new Set(segments.map((segment) => segment.targetSymbol)).size).toBe(10);
    let state = initialPursuitState();
    for (const segment of segments) {
      expect(segment.roads).toHaveLength(3);
      expect(segment.roads.find((road) => road.correct)?.symbol).toBe(segment.targetSymbol);
      state = resolvePursuitSegment(state, true);
    }
    expect(state).toMatchObject({ safetyDistance: 5, successStreak: 10, maxSuccessStreak: 10 });

    const input: CampaignCompletionInput = {
      resultId,
      profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-06',
      gameplayId: 'chase',
      stars: pursuitStars(state.safetyDistance),
      performance: {
        kind: 'pursuit',
        finalSafetyDistance: state.safetyDistance,
        maxSuccessStreak: state.maxSuccessStreak
      },
      durationMs: 61_000,
      playedAt: '2026-10-12T05:26:00.000Z',
      appVersion: 'e2e-test'
    };
    const saved = await campaignRepository.completeLevel(input);

    expect(saved.result).toMatchObject({
      id: resultId,
      gameplayId: 'chase',
      stars: 3,
      performance: { kind: 'pursuit', finalSafetyDistance: 5, maxSuccessStreak: 10 },
      xpAwarded: 50
    });
    expect(saved.experience.totalXp).toBe(300);
    expect(saved.snapshot.levels).toEqual(expect.arrayContaining([
      expect.objectContaining({ levelId: 'level-06', bestStars: 3, bestResultId: resultId }),
      expect.objectContaining({ levelId: 'level-07', bestStars: 0 })
    ]));
    expect(await storedCampaignCounts(profile.id)).toEqual({ results: 6, events: 24 });
  });

  it('persists all six rune-gate nodes and unlocks the magic door atomically', async () => {
    const profile = await profileRepository.create('秘道整合測試', '1234');
    await campaignRepository.startCampaign(profile.id, FIRST_CAMPAIGN_ID, '2026-10-12T05:30:00.000Z');
    await campaignRepository.completeLevel(completion(
      profile.id,
      'passage-level-one-prerequisite',
      '2026-10-12T05:31:00.000Z'
    ));
    await campaignRepository.completeLevel({
      resultId: 'passage-level-two-prerequisite', profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID, levelId: 'level-02', gameplayId: 'sound-maze', stars: 3,
      performance: { kind: 'maze', wrongRouteCount: 0 }, durationMs: 50_000,
      playedAt: '2026-10-12T05:32:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'passage-level-three-prerequisite', profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID, levelId: 'level-03', gameplayId: 'memory-explore', stars: 3,
      performance: { kind: 'memory-explore', wrongPairCount: 0 }, durationMs: 85_000,
      playedAt: '2026-10-12T05:33:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'passage-level-four-prerequisite', profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID, levelId: 'level-04', gameplayId: 'escort', stars: 3,
      performance: { kind: 'pursuit', finalSafetyDistance: 5, maxSuccessStreak: 10 }, durationMs: 62_000,
      playedAt: '2026-10-12T05:34:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'passage-level-five-prerequisite', profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID, levelId: 'level-05', gameplayId: 'zhuyin-battle', stars: 3,
      performance: { kind: 'battle', remainingLives: 5 }, durationMs: 78_000,
      playedAt: '2026-10-12T05:35:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'passage-level-six-prerequisite', profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID, levelId: 'level-06', gameplayId: 'chase', stars: 3,
      performance: { kind: 'pursuit', finalSafetyDistance: 5, maxSuccessStreak: 10 }, durationMs: 61_000,
      playedAt: '2026-10-12T05:36:00.000Z', appVersion: 'e2e-test'
    });

    const resultId = 'level-07-rune-gate-run';
    const nodes = createLevelSevenSoundMaze(resultId, new DeterministicRandom([0.14, 0.86, 0.32, 0.69]));
    expect(nodes).toHaveLength(6);
    expect(nodes.filter((node) => node.fragment)).toHaveLength(3);
    expect(nodes.filter((node) => node.targetSymbol === 'ㄅ')).toHaveLength(2);
    expect(nodes.filter((node) => node.targetSymbol === 'ㄉ')).toHaveLength(2);
    for (const node of nodes) {
      expect(node.routes).toHaveLength(3);
      expect(node.routes.find((route) => route.correct)?.symbol).toBe(node.targetSymbol);
    }

    const input: CampaignCompletionInput = {
      resultId,
      profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-07',
      gameplayId: 'sound-maze',
      stars: soundMazeStars(0),
      performance: { kind: 'maze', wrongRouteCount: 0 },
      durationMs: 92_000,
      playedAt: '2026-10-12T05:37:00.000Z',
      appVersion: 'e2e-test'
    };
    const saved = await campaignRepository.completeLevel(input);

    expect(saved.result).toMatchObject({
      id: resultId,
      gameplayId: 'sound-maze',
      stars: 3,
      performance: { kind: 'maze', wrongRouteCount: 0 },
      xpAwarded: 50
    });
    expect(saved.experience.totalXp).toBe(350);
    expect(saved.snapshot.levels).toEqual(expect.arrayContaining([
      expect.objectContaining({ levelId: 'level-07', bestStars: 3, bestResultId: resultId }),
      expect.objectContaining({ levelId: 'level-08', bestStars: 0 })
    ]));
    expect(await storedCampaignCounts(profile.id)).toEqual({ results: 7, events: 28 });
  });

  it('persists all three magic-door locks and unlocks the castle guard battle atomically', async () => {
    const profile = await profileRepository.create('魔法門整合測試', '1234');
    await campaignRepository.startCampaign(profile.id, FIRST_CAMPAIGN_ID, '2026-10-12T05:40:00.000Z');
    await campaignRepository.completeLevel(completion(profile.id, 'door-level-one-prerequisite', '2026-10-12T05:41:00.000Z'));
    await campaignRepository.completeLevel({
      resultId: 'door-level-two-prerequisite', profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID, levelId: 'level-02', gameplayId: 'sound-maze', stars: 3,
      performance: { kind: 'maze', wrongRouteCount: 0 }, durationMs: 50_000,
      playedAt: '2026-10-12T05:42:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'door-level-three-prerequisite', profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID, levelId: 'level-03', gameplayId: 'memory-explore', stars: 3,
      performance: { kind: 'memory-explore', wrongPairCount: 0 }, durationMs: 85_000,
      playedAt: '2026-10-12T05:43:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'door-level-four-prerequisite', profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID, levelId: 'level-04', gameplayId: 'escort', stars: 3,
      performance: { kind: 'pursuit', finalSafetyDistance: 5, maxSuccessStreak: 10 }, durationMs: 62_000,
      playedAt: '2026-10-12T05:44:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'door-level-five-prerequisite', profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID, levelId: 'level-05', gameplayId: 'zhuyin-battle', stars: 3,
      performance: { kind: 'battle', remainingLives: 5 }, durationMs: 78_000,
      playedAt: '2026-10-12T05:45:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'door-level-six-prerequisite', profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID, levelId: 'level-06', gameplayId: 'chase', stars: 3,
      performance: { kind: 'pursuit', finalSafetyDistance: 5, maxSuccessStreak: 10 }, durationMs: 61_000,
      playedAt: '2026-10-12T05:46:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'door-level-seven-prerequisite', profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID, levelId: 'level-07', gameplayId: 'sound-maze', stars: 3,
      performance: { kind: 'maze', wrongRouteCount: 0 }, durationMs: 92_000,
      playedAt: '2026-10-12T05:47:00.000Z', appVersion: 'e2e-test'
    });

    const resultId = 'level-08-magic-door-run';
    const puzzles = createLevelEightSequenceLockPuzzles(
      resultId,
      new DeterministicRandom([0.16, 0.79, 0.41, 0.67])
    );
    expect(puzzles.map((puzzle) => puzzle.cards.length)).toEqual([3, 4, 4]);
    for (const puzzle of puzzles) {
      const slots = puzzle.targetSymbols.map((symbol) =>
        puzzle.cards.find((card) => card.symbol === symbol)!.id
      );
      expect(sequenceLockMatches(puzzle, slots)).toBe(true);
    }

    const input: CampaignCompletionInput = {
      resultId,
      profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-08',
      gameplayId: 'sequence-lock',
      stars: sequenceLockStars(0),
      performance: { kind: 'sequence-lock', wrongSequenceCount: 0 },
      durationMs: 74_000,
      playedAt: '2026-10-12T05:48:00.000Z',
      appVersion: 'e2e-test'
    };
    const saved = await campaignRepository.completeLevel(input);

    expect(saved.result).toMatchObject({
      id: resultId,
      gameplayId: 'sequence-lock',
      stars: 3,
      performance: { kind: 'sequence-lock', wrongSequenceCount: 0 },
      xpAwarded: 50
    });
    expect(saved.experience.totalXp).toBe(400);
    expect(saved.snapshot.levels).toEqual(expect.arrayContaining([
      expect.objectContaining({ levelId: 'level-08', bestStars: 3, bestResultId: resultId }),
      expect.objectContaining({ levelId: 'level-09', bestStars: 0 })
    ]));
    expect(await storedCampaignCounts(profile.id)).toEqual({ results: 8, events: 32 });
  });

  it('persists the shielded castle battle and unlocks the barrier fight atomically', async () => {
    const profile = await profileRepository.create('城堡戰整合測試', '1234');
    await campaignRepository.startCampaign(profile.id, FIRST_CAMPAIGN_ID, '2026-10-12T05:50:00.000Z');
    await campaignRepository.completeLevel(completion(profile.id, 'guard-level-one-prerequisite', '2026-10-12T05:51:00.000Z'));
    await campaignRepository.completeLevel({
      resultId: 'guard-level-two-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-02', gameplayId: 'sound-maze', stars: 3,
      performance: { kind: 'maze', wrongRouteCount: 0 }, durationMs: 50_000,
      playedAt: '2026-10-12T05:52:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'guard-level-three-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-03', gameplayId: 'memory-explore', stars: 3,
      performance: { kind: 'memory-explore', wrongPairCount: 0 }, durationMs: 85_000,
      playedAt: '2026-10-12T05:53:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'guard-level-four-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-04', gameplayId: 'escort', stars: 3,
      performance: { kind: 'pursuit', finalSafetyDistance: 5, maxSuccessStreak: 10 }, durationMs: 62_000,
      playedAt: '2026-10-12T05:54:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'guard-level-five-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-05', gameplayId: 'zhuyin-battle', stars: 3,
      performance: { kind: 'battle', remainingLives: 5 }, durationMs: 78_000,
      playedAt: '2026-10-12T05:55:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'guard-level-six-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-06', gameplayId: 'chase', stars: 3,
      performance: { kind: 'pursuit', finalSafetyDistance: 5, maxSuccessStreak: 10 }, durationMs: 61_000,
      playedAt: '2026-10-12T05:56:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'guard-level-seven-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-07', gameplayId: 'sound-maze', stars: 3,
      performance: { kind: 'maze', wrongRouteCount: 0 }, durationMs: 92_000,
      playedAt: '2026-10-12T05:57:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'guard-level-eight-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-08', gameplayId: 'sequence-lock', stars: 3,
      performance: { kind: 'sequence-lock', wrongSequenceCount: 0 }, durationMs: 74_000,
      playedAt: '2026-10-12T05:58:00.000Z', appVersion: 'e2e-test'
    });

    const resultId = 'level-09-castle-battle-run';
    const plan = createLevelNineBattle(resultId, new DeterministicRandom([0.18, 0.83, 0.39, 0.68]));
    expect(plan.waves.map((wave) => wave.length)).toEqual([1, 2, 1, 2, 2]);
    expect(plan.waves[4].map((enemy) => enemy.kind)).toEqual(['normal', 'shielded']);
    for (const enemy of plan.waves.flat()) {
      let resolved = normalBattleAttack(enemy);
      resolved = normalBattleAttack(resolved);
      if (enemy.kind === 'shielded') resolved = normalBattleAttack(resolved);
      expect(resolved.life).toBe(0);
    }

    const remainingLives = 5;
    const input: CampaignCompletionInput = {
      resultId,
      profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-09',
      gameplayId: 'zhuyin-battle',
      stars: battleStars(remainingLives),
      performance: { kind: 'battle', remainingLives },
      durationMs: 104_000,
      playedAt: '2026-10-12T05:59:00.000Z',
      appVersion: 'e2e-test'
    };
    const saved = await campaignRepository.completeLevel(input);

    expect(saved.result).toMatchObject({
      id: resultId,
      gameplayId: 'zhuyin-battle',
      stars: 3,
      performance: { kind: 'battle', remainingLives: 5 },
      xpAwarded: 50
    });
    expect(saved.experience.totalXp).toBe(450);
    expect(saved.snapshot.levels).toEqual(expect.arrayContaining([
      expect.objectContaining({ levelId: 'level-09', bestStars: 3, bestResultId: resultId }),
      expect.objectContaining({ levelId: 'level-10', bestStars: 0 })
    ]));
    expect(await storedCampaignCounts(profile.id)).toEqual({ results: 9, events: 36 });
  });

  it('persists all five memory-battle groups and unlocks the boss fight atomically', async () => {
    const profile = await profileRepository.create('結界整合測試', '1234');
    await campaignRepository.startCampaign(profile.id, FIRST_CAMPAIGN_ID, '2026-10-12T06:00:00.000Z');
    await campaignRepository.completeLevel(completion(profile.id, 'barrier-level-one-prerequisite', '2026-10-12T06:01:00.000Z'));
    await campaignRepository.completeLevel({
      resultId: 'barrier-level-two-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-02', gameplayId: 'sound-maze', stars: 3,
      performance: { kind: 'maze', wrongRouteCount: 0 }, durationMs: 50_000,
      playedAt: '2026-10-12T06:02:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'barrier-level-three-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-03', gameplayId: 'memory-explore', stars: 3,
      performance: { kind: 'memory-explore', wrongPairCount: 0 }, durationMs: 85_000,
      playedAt: '2026-10-12T06:03:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'barrier-level-four-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-04', gameplayId: 'escort', stars: 3,
      performance: { kind: 'pursuit', finalSafetyDistance: 5, maxSuccessStreak: 10 }, durationMs: 62_000,
      playedAt: '2026-10-12T06:04:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'barrier-level-five-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-05', gameplayId: 'zhuyin-battle', stars: 3,
      performance: { kind: 'battle', remainingLives: 5 }, durationMs: 78_000,
      playedAt: '2026-10-12T06:05:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'barrier-level-six-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-06', gameplayId: 'chase', stars: 3,
      performance: { kind: 'pursuit', finalSafetyDistance: 5, maxSuccessStreak: 10 }, durationMs: 61_000,
      playedAt: '2026-10-12T06:06:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'barrier-level-seven-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-07', gameplayId: 'sound-maze', stars: 3,
      performance: { kind: 'maze', wrongRouteCount: 0 }, durationMs: 92_000,
      playedAt: '2026-10-12T06:07:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'barrier-level-eight-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-08', gameplayId: 'sequence-lock', stars: 3,
      performance: { kind: 'sequence-lock', wrongSequenceCount: 0 }, durationMs: 74_000,
      playedAt: '2026-10-12T06:08:00.000Z', appVersion: 'e2e-test'
    });
    await campaignRepository.completeLevel({
      resultId: 'barrier-level-nine-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-09', gameplayId: 'zhuyin-battle', stars: 3,
      performance: { kind: 'battle', remainingLives: 5 }, durationMs: 104_000,
      playedAt: '2026-10-12T06:09:00.000Z', appVersion: 'e2e-test'
    });

    const resultId = 'level-10-memory-battle-run';
    const plan = createMemoryBattlePlan(resultId, new DeterministicRandom([0.15, 0.85, 0.34, 0.71]));
    let layout: MemoryExploreLayout = plan.cards;
    plan.targetSymbols.forEach((target, index) => {
      const matchingIds = layout.filter((card) => card.symbol === target).map((card) => card.id);
      expect(memoryExplorePairMatches(layout, matchingIds.slice(0, 2), target)).toBe(true);
      if (index + 1 < plan.targetSymbols.length) {
        layout = replaceAndReshuffleMemoryGroup(
          layout,
          target,
          plan.replacementSymbols[index],
          plan.id,
          index,
          new DeterministicRandom([0.23, 0.77])
        );
      }
    });

    const remainingLives = 5;
    const input: CampaignCompletionInput = {
      resultId,
      profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-10',
      gameplayId: 'memory-battle',
      stars: memoryBattleStars(remainingLives),
      performance: { kind: 'battle', remainingLives },
      durationMs: 118_000,
      playedAt: '2026-10-12T06:10:00.000Z',
      appVersion: 'e2e-test'
    };
    const saved = await campaignRepository.completeLevel(input);

    expect(saved.result).toMatchObject({
      id: resultId,
      gameplayId: 'memory-battle',
      stars: 3,
      performance: { kind: 'battle', remainingLives: 5 },
      xpAwarded: 50
    });
    expect(saved.experience.totalXp).toBe(500);
    expect(saved.snapshot.levels).toEqual(expect.arrayContaining([
      expect.objectContaining({ levelId: 'level-10', bestStars: 3, bestResultId: resultId }),
      expect.objectContaining({ levelId: 'level-11', bestStars: 0 })
    ]));
    expect(await storedCampaignCounts(profile.id)).toEqual({ results: 10, events: 40 });
  });

  it('persists the boss victory, completes chapter one and awards no separate chapter XP', async () => {
    const profile = await profileRepository.create('頭目戰整合測試', '1234');
    await campaignRepository.startCampaign(profile.id, FIRST_CAMPAIGN_ID, '2026-10-12T06:20:00.000Z');

    const prerequisites: CampaignCompletionInput[] = [
      completion(profile.id, 'boss-level-one-prerequisite', '2026-10-12T06:21:00.000Z'),
      {
        resultId: 'boss-level-two-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
        levelId: 'level-02', gameplayId: 'sound-maze', stars: 3,
        performance: { kind: 'maze', wrongRouteCount: 0 }, durationMs: 50_000,
        playedAt: '2026-10-12T06:22:00.000Z', appVersion: 'e2e-test'
      },
      {
        resultId: 'boss-level-three-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
        levelId: 'level-03', gameplayId: 'memory-explore', stars: 3,
        performance: { kind: 'memory-explore', wrongPairCount: 0 }, durationMs: 85_000,
        playedAt: '2026-10-12T06:23:00.000Z', appVersion: 'e2e-test'
      },
      {
        resultId: 'boss-level-four-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
        levelId: 'level-04', gameplayId: 'escort', stars: 3,
        performance: { kind: 'pursuit', finalSafetyDistance: 5, maxSuccessStreak: 10 }, durationMs: 62_000,
        playedAt: '2026-10-12T06:24:00.000Z', appVersion: 'e2e-test'
      },
      {
        resultId: 'boss-level-five-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
        levelId: 'level-05', gameplayId: 'zhuyin-battle', stars: 3,
        performance: { kind: 'battle', remainingLives: 5 }, durationMs: 78_000,
        playedAt: '2026-10-12T06:25:00.000Z', appVersion: 'e2e-test'
      },
      {
        resultId: 'boss-level-six-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
        levelId: 'level-06', gameplayId: 'chase', stars: 3,
        performance: { kind: 'pursuit', finalSafetyDistance: 5, maxSuccessStreak: 10 }, durationMs: 61_000,
        playedAt: '2026-10-12T06:26:00.000Z', appVersion: 'e2e-test'
      },
      {
        resultId: 'boss-level-seven-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
        levelId: 'level-07', gameplayId: 'sound-maze', stars: 3,
        performance: { kind: 'maze', wrongRouteCount: 0 }, durationMs: 92_000,
        playedAt: '2026-10-12T06:27:00.000Z', appVersion: 'e2e-test'
      },
      {
        resultId: 'boss-level-eight-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
        levelId: 'level-08', gameplayId: 'sequence-lock', stars: 3,
        performance: { kind: 'sequence-lock', wrongSequenceCount: 0 }, durationMs: 74_000,
        playedAt: '2026-10-12T06:28:00.000Z', appVersion: 'e2e-test'
      },
      {
        resultId: 'boss-level-nine-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
        levelId: 'level-09', gameplayId: 'zhuyin-battle', stars: 3,
        performance: { kind: 'battle', remainingLives: 5 }, durationMs: 104_000,
        playedAt: '2026-10-12T06:29:00.000Z', appVersion: 'e2e-test'
      },
      {
        resultId: 'boss-level-ten-prerequisite', profileId: profile.id, campaignId: FIRST_CAMPAIGN_ID,
        levelId: 'level-10', gameplayId: 'memory-battle', stars: 3,
        performance: { kind: 'battle', remainingLives: 5 }, durationMs: 118_000,
        playedAt: '2026-10-12T06:30:00.000Z', appVersion: 'e2e-test'
      }
    ];
    for (const prerequisite of prerequisites) {
      await campaignRepository.completeLevel(prerequisite);
    }

    const resultId = 'level-11-boss-battle-run';
    const plan = createBossBattle(resultId, new DeterministicRandom([0.19, 0.81, 0.37, 0.66]));
    expect(plan.waves.map((wave) => wave.map((enemy) => enemy.kind))).toEqual([
      ['normal'],
      ['normal', 'normal'],
      ['shielded'],
      ['normal', 'shielded'],
      ['boss']
    ]);
    expect(plan.waves[4][0]).toMatchObject({ kind: 'boss', life: 6, shield: 2 });
    for (const enemy of plan.waves.flat()) {
      let resolved = enemy;
      let attackCount = 0;
      while (resolved.life > 0 && attackCount < 10) {
        resolved = normalBattleAttack(resolved);
        attackCount += 1;
      }
      expect(resolved.life).toBe(0);
      expect(attackCount).toBe(enemy.life + enemy.shield);
    }

    const playedAt = '2026-10-12T06:31:00.000Z';
    const saved = await campaignRepository.completeLevel({
      resultId,
      profileId: profile.id,
      campaignId: FIRST_CAMPAIGN_ID,
      levelId: 'level-11',
      gameplayId: 'boss-battle',
      stars: battleStars(5),
      performance: { kind: 'battle', remainingLives: 5 },
      durationMs: 160_000,
      playedAt,
      appVersion: 'e2e-test'
    });

    expect(saved.result).toMatchObject({
      id: resultId,
      gameplayId: 'boss-battle',
      stars: 3,
      performance: { kind: 'battle', remainingLives: 5 },
      xpAwarded: 50
    });
    expect(saved.experience.totalXp).toBe(550);
    expect(saved.snapshot.chapter).toMatchObject({ completedAt: playedAt });
    expect(saved.snapshot.levels).toHaveLength(11);
    expect(saved.snapshot.levels).toEqual(expect.arrayContaining([
      expect.objectContaining({ levelId: 'level-11', bestStars: 3, bestResultId: resultId })
    ]));
    expect(await storedCampaignCounts(profile.id)).toEqual({ results: 11, events: 44 });
  });

  it('keeps guest progress in memory only and cannot transfer it to a formal account', async () => {
    await campaignRepository.startCampaign(GUEST_PROFILE_ID, FIRST_CAMPAIGN_ID, '2026-10-12T05:00:00.000Z');
    const guestInput = completion(
      GUEST_PROFILE_ID,
      'guest-run-001',
      '2026-10-12T05:05:00.000Z'
    );
    await campaignRepository.completeLevel(guestInput);
    const duplicate = await campaignRepository.completeLevel(guestInput);
    expect(duplicate).toMatchObject({ duplicate: true, experience: { totalXp: 50 } });
    expect(await storedCampaignCounts(GUEST_PROFILE_ID)).toEqual({ results: 0, events: 0 });

    const profile = await profileRepository.create('訪客不可移轉測試', '1234');
    const formalSnapshot = await campaignRepository.loadCampaign(profile.id, FIRST_CAMPAIGN_ID);
    expect(formalSnapshot).toEqual({ chapter: null, levels: [], flags: [] });
    await expect(resultRepository.experience(profile.id)).resolves.toMatchObject({ totalXp: 0 });

    campaignRepository.clearGuestSession();
    await expect(campaignRepository.loadCampaign(GUEST_PROFILE_ID, FIRST_CAMPAIGN_ID))
      .resolves.toEqual({ chapter: null, levels: [], flags: [] });
    await expect(resultRepository.experience(GUEST_PROFILE_ID))
      .resolves.toMatchObject({ totalXp: 0 });
  });
});
