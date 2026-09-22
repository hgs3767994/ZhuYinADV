import type { Difficulty, GameResult, LeaderboardPage } from '../game/types';

const DATABASE_NAME = 'little-zhuyin-adventurer';
const DATABASE_VERSION = 1;
const RESULT_STORE = 'gameResults';

export interface ResultRepository {
  save(result: GameResult): Promise<void>;
  leaderboard(profileId: string, page: LeaderboardPage, limit?: number): Promise<GameResult[]>;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RESULT_STORE)) {
        const store = database.createObjectStore(RESULT_STORE, { keyPath: 'id' });
        store.createIndex('profileId', 'profileId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('無法開啟冒險紀錄資料庫'));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('資料庫操作失敗'));
  });
}

class IndexedDbResultRepository implements ResultRepository {
  async save(result: GameResult): Promise<void> {
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
    const database = await openDatabase();
    try {
      const transaction = database.transaction(RESULT_STORE, 'readonly');
      const index = transaction.objectStore(RESULT_STORE).index('profileId');
      const records = await requestResult(index.getAll(profileId));
      const difficulty: Difficulty | null = page === 'endless' ? null : page;

      return records
        .filter((record) =>
          page === 'endless'
            ? record.modeId === 'endless'
            : record.modeId === 'normal' && record.difficultyId === difficulty
        )
        .sort((left, right) => right.score - left.score || right.playedAt.localeCompare(left.playedAt))
        .slice(0, limit);
    } finally {
      database.close();
    }
  }
}

export const resultRepository: ResultRepository = new IndexedDbResultRepository();
