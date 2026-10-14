import {
  campaignDefinition,
  campaignLevel,
  nextCampaignLevel
} from '../game/campaignConfig';
import { experienceProgress, type ExperienceProgress, type RankId } from '../game/experience';
import type {
  CampaignChapterProgress,
  CampaignCompletionInput,
  CampaignContentFlag,
  CampaignContentFlagType,
  CampaignExperienceEvent,
  CampaignLevelProgress,
  CampaignResult,
  CampaignRewardKind,
  CampaignSnapshot,
  SavedCampaignCompletion
} from '../game/campaignTypes';
import {
  CAMPAIGN_CHAPTER_PROGRESS_STORE,
  CAMPAIGN_CONTENT_FLAG_STORE,
  CAMPAIGN_LEVEL_PROGRESS_STORE,
  CAMPAIGN_RESULT_STORE,
  EXPERIENCE_STORE,
  openDatabase,
  requestResult,
  transactionDone,
  XP_EVENT_STORE
} from './database';
import { guestSessionStore } from './guestSessionStore';
import { GUEST_PROFILE_ID } from './profileRepository';

interface StoredExperience {
  profileId: string;
  totalXp: number;
  rankId: RankId;
  updatedAt: string;
}

interface RewardSpec {
  eventId: string;
  rewardKind: CampaignRewardKind;
  xpAwarded: number;
}

interface CompletionCore {
  result: CampaignResult;
  experience: ExperienceProgress;
  previousRankId: RankId;
  duplicate: boolean;
}

export interface CampaignRepository {
  loadCampaign(profileId: string, campaignId: string): Promise<CampaignSnapshot>;
  startCampaign(profileId: string, campaignId: string, seenAt: string): Promise<CampaignSnapshot>;
  enterLevel(
    profileId: string,
    campaignId: string,
    levelId: string,
    enteredAt: string,
    tutorialId?: string
  ): Promise<void>;
  markContentSeen(
    profileId: string,
    flagType: CampaignContentFlagType,
    contentId: string,
    seenAt: string
  ): Promise<void>;
  completeLevel(input: CampaignCompletionInput): Promise<SavedCampaignCompletion>;
  clearGuestSession(): void;
}

function joinId(...parts: string[]): string {
  return parts.join(':');
}

export function campaignLevelProgressId(
  profileId: string,
  campaignId: string,
  levelId: string
): string {
  return joinId('campaign-level', profileId, campaignId, levelId);
}

export function campaignChapterProgressId(profileId: string, campaignId: string): string {
  return joinId('campaign-chapter', profileId, campaignId);
}

export function campaignContentFlagId(
  profileId: string,
  flagType: CampaignContentFlagType,
  contentId: string
): string {
  return joinId('campaign-flag', profileId, flagType, contentId);
}

export function campaignXpEventId(
  profileId: string,
  campaignId: string,
  levelId: string,
  rewardKind: CampaignRewardKind,
  resultId?: string
): string {
  if (rewardKind === 'replay-three-star') {
    if (!resultId?.trim()) throw new Error('三星重玩獎勵缺少闖關結果識別碼');
    return joinId('campaign-xp', profileId, campaignId, levelId, resultId, rewardKind);
  }
  return joinId('campaign-xp', profileId, campaignId, levelId, rewardKind);
}

function requireText(value: string, error: string): void {
  if (!value.trim()) throw new Error(error);
}

function requireTimestamp(value: string): void {
  if (Number.isNaN(Date.parse(value))) throw new Error('闖關時間格式不正確');
}

function validateCount(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function validateCompletion(input: CampaignCompletionInput): void {
  requireText(input.resultId, '缺少闖關結果識別碼');
  requireText(input.profileId, '缺少玩家識別碼');
  requireText(input.appVersion, '缺少應用程式版本');
  requireTimestamp(input.playedAt);
  if (![1, 2, 3].includes(input.stars)) throw new Error('闖關星級不正確');
  if (!Number.isFinite(input.durationMs) || input.durationMs < 0) {
    throw new Error('闖關時間不正確');
  }
  const level = campaignLevel(input.campaignId, input.levelId);
  if (level.gameplayId !== input.gameplayId) throw new Error('關卡玩法識別碼不正確');

  const performance = input.performance;
  const valid = (() => {
    switch (input.gameplayId) {
      case 'sound-maze':
        return performance.kind === 'maze' && validateCount(performance.wrongRouteCount);
      case 'memory-explore':
        return performance.kind === 'memory-explore' && validateCount(performance.wrongPairCount);
      case 'sequence-lock':
        return performance.kind === 'sequence-lock' && validateCount(performance.wrongSequenceCount);
      case 'escort':
      case 'chase':
        return performance.kind === 'pursuit' &&
          validateCount(performance.finalSafetyDistance) &&
          performance.finalSafetyDistance <= 5 &&
          validateCount(performance.maxSuccessStreak) &&
          performance.maxSuccessStreak <= 10;
      case 'zhuyin-battle':
      case 'memory-battle':
      case 'boss-battle':
        return performance.kind === 'battle' &&
          validateCount(performance.remainingLives) &&
          performance.remainingLives <= 5;
    }
  })();
  if (!valid) throw new Error('闖關結算資料與玩法不一致');
}

function newLevelProgress(
  profileId: string,
  campaignId: string,
  levelId: string,
  unlockedAt: string
): CampaignLevelProgress {
  return {
    id: campaignLevelProgressId(profileId, campaignId, levelId),
    profileId,
    campaignId,
    levelId,
    unlockedAt,
    bestStars: 0,
    updatedAt: unlockedAt,
    revision: 1
  };
}

function newChapterProgress(
  profileId: string,
  campaignId: string,
  createdAt: string
): CampaignChapterProgress {
  return {
    id: campaignChapterProgressId(profileId, campaignId),
    profileId,
    campaignId,
    createdAt,
    updatedAt: createdAt,
    revision: 1
  };
}

function contentFlag(
  profileId: string,
  flagType: CampaignContentFlagType,
  contentId: string,
  seenAt: string
): CampaignContentFlag {
  return {
    id: campaignContentFlagId(profileId, flagType, contentId),
    profileId,
    flagType,
    contentId,
    seenAt
  };
}

function rewardSpecs(input: CampaignCompletionInput, progress: CampaignLevelProgress): RewardSpec[] {
  const specs: RewardSpec[] = [];
  if (!progress.firstCompletedAt) {
    specs.push({
      eventId: campaignXpEventId(input.profileId, input.campaignId, input.levelId, 'clear'),
      rewardKind: 'clear',
      xpAwarded: 20
    });
  }
  for (let star = progress.bestStars + 1; star <= input.stars; star += 1) {
    const rewardKind = `star-${star}` as CampaignRewardKind;
    specs.push({
      eventId: campaignXpEventId(input.profileId, input.campaignId, input.levelId, rewardKind),
      rewardKind,
      xpAwarded: 10
    });
  }
  if (progress.bestStars === 3 && input.stars === 3) {
    specs.push({
      eventId: campaignXpEventId(
        input.profileId,
        input.campaignId,
        input.levelId,
        'replay-three-star',
        input.resultId
      ),
      rewardKind: 'replay-three-star',
      xpAwarded: 10
    });
  }
  return specs;
}

function assertResultMatchesInput(existing: CampaignResult, input: CampaignCompletionInput): void {
  const matches = existing.id === input.resultId &&
    existing.profileId === input.profileId &&
    existing.campaignId === input.campaignId &&
    existing.levelId === input.levelId &&
    existing.gameplayId === input.gameplayId &&
    existing.stars === input.stars &&
    existing.durationMs === input.durationMs &&
    existing.playedAt === input.playedAt &&
    existing.appVersion === input.appVersion &&
    JSON.stringify(existing.performance) === JSON.stringify(input.performance);
  if (!matches) throw new Error('闖關結果識別碼與既有內容不一致');
}

function assertEventIdentity(event: CampaignExperienceEvent, spec: RewardSpec, input: CampaignCompletionInput): void {
  const matches = event.eventId === spec.eventId &&
    event.profileId === input.profileId &&
    event.sourceType === 'campaign' &&
    event.campaignId === input.campaignId &&
    event.levelId === input.levelId &&
    event.rewardKind === spec.rewardKind &&
    event.xpAwarded === spec.xpAwarded;
  if (!matches) throw new Error('闖關 XP 事件識別碼與既有內容不一致');
}

function sortedLevels(campaignId: string, levels: CampaignLevelProgress[]): CampaignLevelProgress[] {
  const order = new Map(campaignDefinition(campaignId).levels.map((level, index) => [level.id, index]));
  return [...levels].sort((left, right) =>
    (order.get(left.levelId) ?? Number.MAX_SAFE_INTEGER) -
    (order.get(right.levelId) ?? Number.MAX_SAFE_INTEGER)
  );
}

class IndexedDbCampaignRepository implements CampaignRepository {
  async loadCampaign(profileId: string, campaignId: string): Promise<CampaignSnapshot> {
    campaignDefinition(campaignId);
    if (profileId === GUEST_PROFILE_ID) return this.loadGuest(campaignId);
    const database = await openDatabase();
    try {
      return await this.loadPersistent(database, profileId, campaignId);
    } finally {
      database.close();
    }
  }

  async startCampaign(
    profileId: string,
    campaignId: string,
    seenAt: string
  ): Promise<CampaignSnapshot> {
    const campaign = campaignDefinition(campaignId);
    requireTimestamp(seenAt);
    if (profileId === GUEST_PROFILE_ID) {
      const chapterId = campaignChapterProgressId(profileId, campaignId);
      const firstLevel = campaign.levels[0];
      const levelId = campaignLevelProgressId(profileId, campaignId, firstLevel.id);
      const flag = contentFlag(profileId, 'chapter-intro', campaignId, seenAt);
      if (!guestSessionStore.campaignChapters.has(chapterId)) {
        guestSessionStore.campaignChapters.set(
          chapterId,
          newChapterProgress(profileId, campaignId, seenAt)
        );
      }
      if (!guestSessionStore.campaignLevels.has(levelId)) {
        guestSessionStore.campaignLevels.set(
          levelId,
          newLevelProgress(profileId, campaignId, firstLevel.id, seenAt)
        );
      }
      if (!guestSessionStore.campaignFlags.has(flag.id)) {
        guestSessionStore.campaignFlags.set(flag.id, flag);
      }
      return this.loadGuest(campaignId);
    }

    const database = await openDatabase();
    try {
      await this.startPersistent(database, profileId, campaignId, campaign.levels[0].id, seenAt);
      return await this.loadPersistent(database, profileId, campaignId);
    } finally {
      database.close();
    }
  }

  async enterLevel(
    profileId: string,
    campaignId: string,
    levelId: string,
    enteredAt: string,
    tutorialId?: string
  ): Promise<void> {
    campaignLevel(campaignId, levelId);
    requireTimestamp(enteredAt);
    if (tutorialId !== undefined) requireText(tutorialId, '教學識別碼不得為空');
    if (profileId === GUEST_PROFILE_ID) {
      const progress = guestSessionStore.campaignLevels.get(
        campaignLevelProgressId(profileId, campaignId, levelId)
      );
      const chapter = guestSessionStore.campaignChapters.get(
        campaignChapterProgressId(profileId, campaignId)
      );
      if (!progress || !chapter) throw new Error('關卡尚未解鎖');
      guestSessionStore.campaignChapters.set(chapter.id, {
        ...chapter,
        recentLevelId: levelId,
        recentLevelAt: enteredAt,
        updatedAt: enteredAt,
        revision: chapter.revision + 1
      });
      if (tutorialId) {
        const flag = contentFlag(profileId, 'tutorial', tutorialId, enteredAt);
        if (!guestSessionStore.campaignFlags.has(flag.id)) {
          guestSessionStore.campaignFlags.set(flag.id, flag);
        }
      }
      return;
    }

    const database = await openDatabase();
    try {
      await this.enterPersistent(database, profileId, campaignId, levelId, enteredAt, tutorialId);
    } finally {
      database.close();
    }
  }

  async markContentSeen(
    profileId: string,
    flagType: CampaignContentFlagType,
    contentId: string,
    seenAt: string
  ): Promise<void> {
    requireText(contentId, '內容識別碼不得為空');
    requireTimestamp(seenAt);
    const flag = contentFlag(profileId, flagType, contentId, seenAt);
    if (profileId === GUEST_PROFILE_ID) {
      if (!guestSessionStore.campaignFlags.has(flag.id)) {
        guestSessionStore.campaignFlags.set(flag.id, flag);
      }
      return;
    }
    const database = await openDatabase();
    try {
      await this.markContentPersistent(database, flag);
    } finally {
      database.close();
    }
  }

  async completeLevel(input: CampaignCompletionInput): Promise<SavedCampaignCompletion> {
    validateCompletion(input);
    if (input.profileId === GUEST_PROFILE_ID) return this.completeGuest(input);
    const database = await openDatabase();
    try {
      const core = await this.completePersistent(database, input);
      return {
        ...core,
        snapshot: await this.loadPersistent(database, input.profileId, input.campaignId)
      };
    } finally {
      database.close();
    }
  }

  clearGuestSession(): void {
    guestSessionStore.clear();
  }

  private loadGuest(campaignId: string): CampaignSnapshot {
    const profileId = GUEST_PROFILE_ID;
    return {
      chapter: guestSessionStore.campaignChapters.get(
        campaignChapterProgressId(profileId, campaignId)
      ) ?? null,
      levels: sortedLevels(
        campaignId,
        [...guestSessionStore.campaignLevels.values()].filter((item) =>
          item.profileId === profileId && item.campaignId === campaignId
        )
      ),
      flags: [...guestSessionStore.campaignFlags.values()].filter((item) =>
        item.profileId === profileId &&
        (item.contentId === campaignId || item.flagType === 'tutorial')
      )
    };
  }

  private async loadPersistent(
    database: IDBDatabase,
    profileId: string,
    campaignId: string
  ): Promise<CampaignSnapshot> {
    const transaction = database.transaction(
      [
        CAMPAIGN_CHAPTER_PROGRESS_STORE,
        CAMPAIGN_LEVEL_PROGRESS_STORE,
        CAMPAIGN_CONTENT_FLAG_STORE
      ],
      'readonly'
    );
    const done = transactionDone(transaction);
    const [chapter, levels, flags] = await Promise.all([
      requestResult(
        transaction.objectStore(CAMPAIGN_CHAPTER_PROGRESS_STORE)
          .get(campaignChapterProgressId(profileId, campaignId)) as
          IDBRequest<CampaignChapterProgress | undefined>
      ),
      requestResult(
        transaction.objectStore(CAMPAIGN_LEVEL_PROGRESS_STORE)
          .index('profileCampaign')
          .getAll(IDBKeyRange.only([profileId, campaignId])) as
          IDBRequest<CampaignLevelProgress[]>
      ),
      requestResult(
        transaction.objectStore(CAMPAIGN_CONTENT_FLAG_STORE)
          .index('profileId')
          .getAll(profileId) as IDBRequest<CampaignContentFlag[]>
      )
    ]);
    await done;
    return {
      chapter: chapter ?? null,
      levels: sortedLevels(campaignId, levels),
      flags: flags.filter((flag) => flag.contentId === campaignId || flag.flagType === 'tutorial')
    };
  }

  private startPersistent(
    database: IDBDatabase,
    profileId: string,
    campaignId: string,
    firstLevelId: string,
    seenAt: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        [
          CAMPAIGN_CHAPTER_PROGRESS_STORE,
          CAMPAIGN_LEVEL_PROGRESS_STORE,
          CAMPAIGN_CONTENT_FLAG_STORE
        ],
        'readwrite'
      );
      const chapterStore = transaction.objectStore(CAMPAIGN_CHAPTER_PROGRESS_STORE);
      const levelStore = transaction.objectStore(CAMPAIGN_LEVEL_PROGRESS_STORE);
      const flagStore = transaction.objectStore(CAMPAIGN_CONTENT_FLAG_STORE);
      const chapterId = campaignChapterProgressId(profileId, campaignId);
      const levelId = campaignLevelProgressId(profileId, campaignId, firstLevelId);
      const flag = contentFlag(profileId, 'chapter-intro', campaignId, seenAt);
      let chapter: CampaignChapterProgress | undefined;
      let level: CampaignLevelProgress | undefined;
      let existingFlag: CampaignContentFlag | undefined;
      let pending = 3;
      let failure: Error | null = null;

      transaction.oncomplete = () => failure ? reject(failure) : resolve();
      transaction.onerror = () => reject(failure ?? transaction.error ?? new Error('無法開始闖關章節'));
      transaction.onabort = () => reject(failure ?? transaction.error ?? new Error('開始闖關章節的交易已取消'));
      const fail = (error: unknown) => {
        failure = error instanceof Error ? error : new Error('無法開始闖關章節');
        transaction.abort();
      };
      const finishRead = () => {
        pending -= 1;
        if (pending !== 0) return;
        try {
          if (!chapter) chapterStore.add(newChapterProgress(profileId, campaignId, seenAt));
          if (!level) levelStore.add(newLevelProgress(profileId, campaignId, firstLevelId, seenAt));
          if (!existingFlag) flagStore.add(flag);
        } catch (error) {
          fail(error);
        }
      };

      const chapterRequest = chapterStore.get(chapterId) as IDBRequest<CampaignChapterProgress | undefined>;
      chapterRequest.onsuccess = () => { chapter = chapterRequest.result; finishRead(); };
      chapterRequest.onerror = () => fail(chapterRequest.error);
      const levelRequest = levelStore.get(levelId) as IDBRequest<CampaignLevelProgress | undefined>;
      levelRequest.onsuccess = () => { level = levelRequest.result; finishRead(); };
      levelRequest.onerror = () => fail(levelRequest.error);
      const flagRequest = flagStore.get(flag.id) as IDBRequest<CampaignContentFlag | undefined>;
      flagRequest.onsuccess = () => { existingFlag = flagRequest.result; finishRead(); };
      flagRequest.onerror = () => fail(flagRequest.error);
    });
  }

  private enterPersistent(
    database: IDBDatabase,
    profileId: string,
    campaignId: string,
    levelId: string,
    enteredAt: string,
    tutorialId?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        [
          CAMPAIGN_CHAPTER_PROGRESS_STORE,
          CAMPAIGN_LEVEL_PROGRESS_STORE,
          CAMPAIGN_CONTENT_FLAG_STORE
        ],
        'readwrite'
      );
      const chapterStore = transaction.objectStore(CAMPAIGN_CHAPTER_PROGRESS_STORE);
      const levelStore = transaction.objectStore(CAMPAIGN_LEVEL_PROGRESS_STORE);
      const flagStore = transaction.objectStore(CAMPAIGN_CONTENT_FLAG_STORE);
      const flag = tutorialId ? contentFlag(profileId, 'tutorial', tutorialId, enteredAt) : null;
      let chapter: CampaignChapterProgress | undefined;
      let level: CampaignLevelProgress | undefined;
      let existingFlag: CampaignContentFlag | undefined;
      let pending = flag ? 3 : 2;
      let failure: Error | null = null;

      transaction.oncomplete = () => failure ? reject(failure) : resolve();
      transaction.onerror = () => reject(failure ?? transaction.error ?? new Error('無法進入闖關關卡'));
      transaction.onabort = () => reject(failure ?? transaction.error ?? new Error('進入闖關關卡的交易已取消'));
      const fail = (error: unknown) => {
        failure = error instanceof Error ? error : new Error('無法進入闖關關卡');
        transaction.abort();
      };
      const finishRead = () => {
        pending -= 1;
        if (pending !== 0) return;
        if (!level || !chapter) {
          fail(new Error('關卡尚未解鎖'));
          return;
        }
        chapterStore.put({
          ...chapter,
          recentLevelId: levelId,
          recentLevelAt: enteredAt,
          updatedAt: enteredAt,
          revision: chapter.revision + 1
        } satisfies CampaignChapterProgress);
        if (flag && !existingFlag) flagStore.add(flag);
      };

      const chapterRequest = chapterStore.get(
        campaignChapterProgressId(profileId, campaignId)
      ) as IDBRequest<CampaignChapterProgress | undefined>;
      chapterRequest.onsuccess = () => { chapter = chapterRequest.result; finishRead(); };
      chapterRequest.onerror = () => fail(chapterRequest.error);
      const levelRequest = levelStore.get(
        campaignLevelProgressId(profileId, campaignId, levelId)
      ) as IDBRequest<CampaignLevelProgress | undefined>;
      levelRequest.onsuccess = () => { level = levelRequest.result; finishRead(); };
      levelRequest.onerror = () => fail(levelRequest.error);
      if (flag) {
        const flagRequest = flagStore.get(flag.id) as IDBRequest<CampaignContentFlag | undefined>;
        flagRequest.onsuccess = () => { existingFlag = flagRequest.result; finishRead(); };
        flagRequest.onerror = () => fail(flagRequest.error);
      }
    });
  }

  private markContentPersistent(database: IDBDatabase, flag: CampaignContentFlag): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(CAMPAIGN_CONTENT_FLAG_STORE, 'readwrite');
      const store = transaction.objectStore(CAMPAIGN_CONTENT_FLAG_STORE);
      let failure: Error | null = null;
      transaction.oncomplete = () => failure ? reject(failure) : resolve();
      transaction.onerror = () => reject(failure ?? transaction.error ?? new Error('無法保存已看狀態'));
      transaction.onabort = () => reject(failure ?? transaction.error ?? new Error('保存已看狀態的交易已取消'));
      const request = store.get(flag.id) as IDBRequest<CampaignContentFlag | undefined>;
      request.onsuccess = () => {
        if (!request.result) store.add(flag);
      };
      request.onerror = () => {
        failure = request.error ?? new Error('無法讀取已看狀態');
        transaction.abort();
      };
    });
  }

  private completeGuest(input: CampaignCompletionInput): SavedCampaignCompletion {
    const existing = guestSessionStore.campaignResults.get(input.resultId);
    if (existing) {
      assertResultMatchesInput(existing, input);
      return {
        result: existing,
        snapshot: this.loadGuest(input.campaignId),
        experience: experienceProgress(guestSessionStore.totalXp),
        previousRankId: experienceProgress(guestSessionStore.totalXp).rankId,
        duplicate: true
      };
    }

    const progressId = campaignLevelProgressId(input.profileId, input.campaignId, input.levelId);
    const progress = guestSessionStore.campaignLevels.get(progressId);
    const chapter = guestSessionStore.campaignChapters.get(
      campaignChapterProgressId(input.profileId, input.campaignId)
    );
    if (!progress || !chapter) throw new Error('關卡尚未解鎖');

    const previous = experienceProgress(guestSessionStore.totalXp);
    const specs = rewardSpecs(input, progress).filter((spec) => {
      const event = guestSessionStore.campaignEvents.get(spec.eventId);
      if (!event) return true;
      assertEventIdentity(event, spec, input);
      return false;
    });
    let runningXp = guestSessionStore.totalXp;
    const events = specs.map((spec) => {
      const before = experienceProgress(runningXp);
      runningXp += spec.xpAwarded;
      const after = experienceProgress(runningXp);
      return {
        eventId: spec.eventId,
        profileId: input.profileId,
        sourceType: 'campaign' as const,
        resultId: input.resultId,
        campaignId: input.campaignId,
        levelId: input.levelId,
        rewardKind: spec.rewardKind,
        xpAwarded: spec.xpAwarded,
        previousRankId: before.rankId,
        rankId: after.rankId,
        createdAt: input.playedAt
      } satisfies CampaignExperienceEvent;
    });
    const result = this.makeResult(input, events);
    guestSessionStore.campaignResults.set(result.id, result);
    for (const event of events) guestSessionStore.campaignEvents.set(event.eventId, event);
    guestSessionStore.totalXp = runningXp;
    this.updateGuestProgress(input, progress, chapter, result);
    return {
      result,
      snapshot: this.loadGuest(input.campaignId),
      experience: experienceProgress(runningXp),
      previousRankId: previous.rankId,
      duplicate: false
    };
  }

  private updateGuestProgress(
    input: CampaignCompletionInput,
    progress: CampaignLevelProgress,
    chapter: CampaignChapterProgress,
    result: CampaignResult
  ): void {
    const improved = input.stars > progress.bestStars;
    guestSessionStore.campaignLevels.set(progress.id, {
      ...progress,
      firstCompletedAt: progress.firstCompletedAt ?? input.playedAt,
      lastCompletedAt: input.playedAt,
      bestStars: Math.max(progress.bestStars, input.stars) as CampaignLevelProgress['bestStars'],
      bestResultId: improved || !progress.bestResultId ? result.id : progress.bestResultId,
      updatedAt: input.playedAt,
      revision: progress.revision + 1
    });
    const next = nextCampaignLevel(input.campaignId, input.levelId);
    if (next) {
      const nextId = campaignLevelProgressId(input.profileId, input.campaignId, next.id);
      if (!guestSessionStore.campaignLevels.has(nextId)) {
        guestSessionStore.campaignLevels.set(
          nextId,
          newLevelProgress(input.profileId, input.campaignId, next.id, input.playedAt)
        );
      }
    }
    guestSessionStore.campaignChapters.set(chapter.id, {
      ...chapter,
      completedAt: next ? chapter.completedAt : chapter.completedAt ?? input.playedAt,
      recentLevelId: input.levelId,
      recentLevelAt: input.playedAt,
      updatedAt: input.playedAt,
      revision: chapter.revision + 1
    });
  }

  private makeResult(
    input: CampaignCompletionInput,
    events: CampaignExperienceEvent[]
  ): CampaignResult {
    return {
      id: input.resultId,
      profileId: input.profileId,
      campaignId: input.campaignId,
      levelId: input.levelId,
      gameplayId: input.gameplayId,
      stars: input.stars,
      performance: { ...input.performance },
      durationMs: input.durationMs,
      xpEventIds: events.map((event) => event.eventId),
      xpAwarded: events.reduce((total, event) => total + event.xpAwarded, 0),
      playedAt: input.playedAt,
      appVersion: input.appVersion,
      schemaVersion: 1
    };
  }

  private completePersistent(
    database: IDBDatabase,
    input: CampaignCompletionInput
  ): Promise<CompletionCore> {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        [
          CAMPAIGN_RESULT_STORE,
          CAMPAIGN_LEVEL_PROGRESS_STORE,
          CAMPAIGN_CHAPTER_PROGRESS_STORE,
          XP_EVENT_STORE,
          EXPERIENCE_STORE
        ],
        'readwrite'
      );
      const resultStore = transaction.objectStore(CAMPAIGN_RESULT_STORE);
      const levelStore = transaction.objectStore(CAMPAIGN_LEVEL_PROGRESS_STORE);
      const chapterStore = transaction.objectStore(CAMPAIGN_CHAPTER_PROGRESS_STORE);
      const eventStore = transaction.objectStore(XP_EVENT_STORE);
      const experienceStore = transaction.objectStore(EXPERIENCE_STORE);
      const next = nextCampaignLevel(input.campaignId, input.levelId);
      let existingResult: CampaignResult | undefined;
      let progress: CampaignLevelProgress | undefined;
      let nextProgress: CampaignLevelProgress | undefined;
      let chapter: CampaignChapterProgress | undefined;
      let storedExperience: StoredExperience | undefined;
      let response: CompletionCore | null = null;
      let failure: Error | null = null;
      let pending = next ? 5 : 4;

      transaction.oncomplete = () => {
        if (response) resolve(response);
        else reject(failure ?? new Error('闖關完成交易未完成'));
      };
      transaction.onerror = () => reject(failure ?? transaction.error ?? new Error('無法保存闖關結果'));
      transaction.onabort = () => reject(failure ?? transaction.error ?? new Error('闖關完成交易已取消'));
      const fail = (error: unknown) => {
        if (failure) return;
        failure = error instanceof Error ? error : new Error('無法保存闖關結果');
        transaction.abort();
      };
      const finishInitialRead = () => {
        pending -= 1;
        if (pending !== 0) return;
        if (existingResult) {
          try {
            assertResultMatchesInput(existingResult, input);
          } catch (error) {
            fail(error);
            return;
          }
          const current = experienceProgress(storedExperience?.totalXp ?? 0);
          if (existingResult.xpEventIds.length === 0) {
            response = {
              result: existingResult,
              experience: current,
              previousRankId: current.rankId,
              duplicate: true
            };
            return;
          }
          const request = eventStore.get(
            existingResult.xpEventIds[0]
          ) as IDBRequest<CampaignExperienceEvent | undefined>;
          request.onsuccess = () => {
            response = {
              result: existingResult!,
              experience: current,
              previousRankId: request.result?.previousRankId ?? current.rankId,
              duplicate: true
            };
          };
          request.onerror = () => fail(request.error);
          return;
        }
        if (!progress || !chapter) {
          fail(new Error('關卡尚未解鎖'));
          return;
        }
        const specs = rewardSpecs(input, progress);
        if (specs.length === 0) {
          writeCompletion([]);
          return;
        }
        const existingEvents = new Map<string, CampaignExperienceEvent>();
        let eventPending = specs.length;
        for (const spec of specs) {
          const request = eventStore.get(spec.eventId) as IDBRequest<CampaignExperienceEvent | undefined>;
          request.onsuccess = () => {
            if (request.result) {
              try {
                assertEventIdentity(request.result, spec, input);
                existingEvents.set(spec.eventId, request.result);
              } catch (error) {
                fail(error);
                return;
              }
            }
            eventPending -= 1;
            if (eventPending === 0) {
              writeCompletion(specs.filter((specItem) => !existingEvents.has(specItem.eventId)));
            }
          };
          request.onerror = () => fail(request.error);
        }
      };

      const writeCompletion = (newSpecs: RewardSpec[]) => {
        if (!progress || !chapter || failure) return;
        const previous = experienceProgress(storedExperience?.totalXp ?? 0);
        let runningXp = previous.totalXp;
        const events = newSpecs.map((spec) => {
          const before = experienceProgress(runningXp);
          runningXp += spec.xpAwarded;
          const after = experienceProgress(runningXp);
          return {
            eventId: spec.eventId,
            profileId: input.profileId,
            sourceType: 'campaign' as const,
            resultId: input.resultId,
            campaignId: input.campaignId,
            levelId: input.levelId,
            rewardKind: spec.rewardKind,
            xpAwarded: spec.xpAwarded,
            previousRankId: before.rankId,
            rankId: after.rankId,
            createdAt: input.playedAt
          } satisfies CampaignExperienceEvent;
        });
        const result = this.makeResult(input, events);
        const improved = input.stars > progress.bestStars;
        resultStore.add(result);
        for (const event of events) eventStore.add(event);
        levelStore.put({
          ...progress,
          firstCompletedAt: progress.firstCompletedAt ?? input.playedAt,
          lastCompletedAt: input.playedAt,
          bestStars: Math.max(progress.bestStars, input.stars) as CampaignLevelProgress['bestStars'],
          bestResultId: improved || !progress.bestResultId ? result.id : progress.bestResultId,
          updatedAt: input.playedAt,
          revision: progress.revision + 1
        } satisfies CampaignLevelProgress);
        if (next && !nextProgress) {
          levelStore.add(newLevelProgress(input.profileId, input.campaignId, next.id, input.playedAt));
        }
        chapterStore.put({
          ...chapter,
          completedAt: next ? chapter.completedAt : chapter.completedAt ?? input.playedAt,
          recentLevelId: input.levelId,
          recentLevelAt: input.playedAt,
          updatedAt: input.playedAt,
          revision: chapter.revision + 1
        } satisfies CampaignChapterProgress);
        experienceStore.put({
          profileId: input.profileId,
          totalXp: runningXp,
          rankId: experienceProgress(runningXp).rankId,
          updatedAt: input.playedAt
        } satisfies StoredExperience);
        response = {
          result,
          experience: experienceProgress(runningXp),
          previousRankId: previous.rankId,
          duplicate: false
        };
      };

      const resultRequest = resultStore.get(input.resultId) as IDBRequest<CampaignResult | undefined>;
      resultRequest.onsuccess = () => { existingResult = resultRequest.result; finishInitialRead(); };
      resultRequest.onerror = () => fail(resultRequest.error);
      const progressRequest = levelStore.get(
        campaignLevelProgressId(input.profileId, input.campaignId, input.levelId)
      ) as IDBRequest<CampaignLevelProgress | undefined>;
      progressRequest.onsuccess = () => { progress = progressRequest.result; finishInitialRead(); };
      progressRequest.onerror = () => fail(progressRequest.error);
      const chapterRequest = chapterStore.get(
        campaignChapterProgressId(input.profileId, input.campaignId)
      ) as IDBRequest<CampaignChapterProgress | undefined>;
      chapterRequest.onsuccess = () => { chapter = chapterRequest.result; finishInitialRead(); };
      chapterRequest.onerror = () => fail(chapterRequest.error);
      const experienceRequest = experienceStore.get(
        input.profileId
      ) as IDBRequest<StoredExperience | undefined>;
      experienceRequest.onsuccess = () => { storedExperience = experienceRequest.result; finishInitialRead(); };
      experienceRequest.onerror = () => fail(experienceRequest.error);
      if (next) {
        const nextRequest = levelStore.get(
          campaignLevelProgressId(input.profileId, input.campaignId, next.id)
        ) as IDBRequest<CampaignLevelProgress | undefined>;
        nextRequest.onsuccess = () => { nextProgress = nextRequest.result; finishInitialRead(); };
        nextRequest.onerror = () => fail(nextRequest.error);
      }
    });
  }
}

export const campaignRepository: CampaignRepository = new IndexedDbCampaignRepository();
