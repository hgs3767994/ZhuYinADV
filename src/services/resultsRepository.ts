import type { Difficulty, GameResult, LeaderboardPage } from '../game/types';
import {
  calculateGameExperience,
  experienceProgress,
  type ExperienceProgress,
  type RankId
} from '../game/experience';
import {
  EXPERIENCE_STORE,
  openDatabase,
  requestResult,
  RESULT_STORE,
  transactionDone,
  XP_EVENT_STORE
} from './database';
import { GUEST_PROFILE_ID } from './profileRepository';

interface StoredExperience {
  profileId: string;
  totalXp: number;
  rankId: RankId;
  updatedAt: string;
}

interface ExperienceEvent {
  eventId: string;
  profileId: string;
  resultId: string;
  modeId: GameResult['modeId'];
  difficultyId: GameResult['difficultyId'];
  score: number;
  correctCount: number;
  maxCombo: number;
  completed: boolean;
  xpAwarded: number;
  previousRankId: RankId;
  rankId: RankId;
  createdAt: string;
}

export interface SavedGameResult {
  result: GameResult;
  experience: ExperienceProgress;
  previousRankId: RankId;
  duplicate: boolean;
}

export interface ResultRepository {
  save(result: GameResult): Promise<SavedGameResult>;
  experience(profileId: string): Promise<ExperienceProgress>;
  leaderboard(profileId: string, page: LeaderboardPage, limit?: number): Promise<GameResult[]>;
  clearGuestResults(): void;
}

class IndexedDbResultRepository implements ResultRepository {
  private guestResults: GameResult[] = [];
  private guestEvents = new Map<string, GameResult>();
  private guestTotalXp = 0;

  async save(result: GameResult): Promise<SavedGameResult> {
    const canonicalResult = {
      ...result,
      xpAwarded: calculateGameExperience(result)
    };
    if (result.profileId === GUEST_PROFILE_ID) {
      const previous = experienceProgress(this.guestTotalXp);
      const existing = this.guestEvents.get(result.xpEventId);
      if (existing) {
        this.assertMatchingResult(existing, canonicalResult);
        return {
          result: canonicalResult,
          experience: previous,
          previousRankId: previous.rankId,
          duplicate: true
        };
      }
      this.guestEvents.set(result.xpEventId, canonicalResult);
      this.guestResults.push(canonicalResult);
      this.guestTotalXp += canonicalResult.xpAwarded;
      return {
        result: canonicalResult,
        experience: experienceProgress(this.guestTotalXp),
        previousRankId: previous.rankId,
        duplicate: false
      };
    }
    const database = await openDatabase();
    try {
      return await this.savePersistent(database, canonicalResult);
    } finally {
      database.close();
    }
  }

  async experience(profileId: string): Promise<ExperienceProgress> {
    if (profileId === GUEST_PROFILE_ID) return experienceProgress(this.guestTotalXp);
    const database = await openDatabase();
    try {
      const stored = await requestResult(
        database.transaction(EXPERIENCE_STORE, 'readonly')
          .objectStore(EXPERIENCE_STORE)
          .get(profileId) as IDBRequest<StoredExperience | undefined>
      );
      return experienceProgress(stored?.totalXp ?? 0);
    } finally {
      database.close();
    }
  }

  async leaderboard(
    profileId: string,
    page: LeaderboardPage,
    limit = 5
  ): Promise<GameResult[]> {
    if (profileId === GUEST_PROFILE_ID) {
      return this.filterLeaderboard(this.guestResults, page, limit);
    }
    const database = await openDatabase();
    try {
      const transaction = database.transaction(RESULT_STORE, 'readonly');
      const index = transaction.objectStore(RESULT_STORE).index('profileId');
      const records = await requestResult(index.getAll(profileId));
      return this.filterLeaderboard(records, page, limit);
    } finally {
      database.close();
    }
  }

  clearGuestResults(): void {
    this.guestResults = [];
    this.guestEvents.clear();
    this.guestTotalXp = 0;
  }

  private assertMatchingEvent(event: ExperienceEvent, result: GameResult): void {
    const matches = event.profileId === result.profileId &&
      event.resultId === result.id &&
      event.modeId === result.modeId &&
      event.difficultyId === result.difficultyId &&
      event.score === result.score &&
      event.correctCount === result.correctCount &&
      event.maxCombo === result.maxCombo &&
      event.completed === result.completed &&
      event.xpAwarded === result.xpAwarded;
    if (!matches) throw new Error('XP 事件識別碼與既有遊戲結果不一致');
  }

  private assertMatchingResult(existing: GameResult, result: GameResult): void {
    const matches = existing.id === result.id &&
      existing.profileId === result.profileId &&
      existing.modeId === result.modeId &&
      existing.difficultyId === result.difficultyId &&
      existing.score === result.score &&
      existing.correctCount === result.correctCount &&
      existing.maxCombo === result.maxCombo &&
      existing.completed === result.completed &&
      existing.xpAwarded === result.xpAwarded;
    if (!matches) throw new Error('XP 事件識別碼與既有遊戲結果不一致');
  }

  private savePersistent(database: IDBDatabase, result: GameResult): Promise<SavedGameResult> {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        [RESULT_STORE, EXPERIENCE_STORE, XP_EVENT_STORE],
        'readwrite'
      );
      const resultStore = transaction.objectStore(RESULT_STORE);
      const experienceStore = transaction.objectStore(EXPERIENCE_STORE);
      const eventStore = transaction.objectStore(XP_EVENT_STORE);
      let response: SavedGameResult | null = null;
      let failure: Error | null = null;

      transaction.oncomplete = () => {
        if (response) resolve(response);
        else reject(failure ?? new Error('遊戲結果交易未完成'));
      };
      transaction.onerror = () => {
        reject(failure ?? transaction.error ?? new Error('無法保存遊戲結果'));
      };
      transaction.onabort = () => {
        reject(failure ?? transaction.error ?? new Error('遊戲結果交易已取消'));
      };

      const fail = (error: unknown) => {
        failure = error instanceof Error ? error : new Error('無法保存遊戲結果');
        transaction.abort();
      };
      const readProgress = (existingEvent?: ExperienceEvent) => {
        const progressRequest = experienceStore.get(result.profileId) as
          IDBRequest<StoredExperience | undefined>;
        progressRequest.onsuccess = () => {
          const stored = progressRequest.result;
          if (existingEvent) {
            response = {
              result,
              experience: experienceProgress(stored?.totalXp ?? 0),
              previousRankId: existingEvent.previousRankId,
              duplicate: true
            };
            return;
          }

          const previous = experienceProgress(stored?.totalXp ?? 0);
          const next = experienceProgress(previous.totalXp + result.xpAwarded);
          const event: ExperienceEvent = {
            eventId: result.xpEventId,
            profileId: result.profileId,
            resultId: result.id,
            modeId: result.modeId,
            difficultyId: result.difficultyId,
            score: result.score,
            correctCount: result.correctCount,
            maxCombo: result.maxCombo,
            completed: result.completed,
            xpAwarded: result.xpAwarded,
            previousRankId: previous.rankId,
            rankId: next.rankId,
            createdAt: result.playedAt
          };
          resultStore.add(result);
          eventStore.add(event);
          experienceStore.put({
            profileId: result.profileId,
            totalXp: next.totalXp,
            rankId: next.rankId,
            updatedAt: result.playedAt
          } satisfies StoredExperience);
          response = {
            result,
            experience: next,
            previousRankId: previous.rankId,
            duplicate: false
          };
        };
      };

      const eventRequest = eventStore.get(result.xpEventId) as
        IDBRequest<ExperienceEvent | undefined>;
      eventRequest.onsuccess = () => {
        const existingEvent = eventRequest.result;
        if (existingEvent) {
          try {
            this.assertMatchingEvent(existingEvent, result);
          } catch (error) {
            fail(error);
            return;
          }
        }
        readProgress(existingEvent);
      };
    });
  }

  private filterLeaderboard(
    records: GameResult[],
    page: LeaderboardPage,
    limit: number
  ): GameResult[] {
    const difficulty: Difficulty | null = page === 'endless' ? null : page;
    return records
      .filter((record) =>
        page === 'endless'
          ? record.modeId === 'endless'
          : record.modeId === 'normal' && record.difficultyId === difficulty
      )
      .sort((left, right) => right.score - left.score || right.playedAt.localeCompare(left.playedAt))
      .slice(0, limit);
  }
}

export const resultRepository: ResultRepository = new IndexedDbResultRepository();
