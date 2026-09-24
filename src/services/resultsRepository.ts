import type { Difficulty, GameResult, LeaderboardPage } from '../game/types';
import { openDatabase, requestResult, RESULT_STORE } from './database';
import { GUEST_PROFILE_ID } from './profileRepository';

export interface ResultRepository {
  save(result: GameResult): Promise<void>;
  leaderboard(profileId: string, page: LeaderboardPage, limit?: number): Promise<GameResult[]>;
  clearGuestResults(): void;
}

class IndexedDbResultRepository implements ResultRepository {
  private guestResults: GameResult[] = [];

  async save(result: GameResult): Promise<void> {
    if (result.profileId === GUEST_PROFILE_ID) {
      this.guestResults.push(result);
      return;
    }
    const database = await openDatabase();
    try {
      const transaction = database.transaction(RESULT_STORE, 'readwrite');
      await requestResult(transaction.objectStore(RESULT_STORE).put(result));
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
