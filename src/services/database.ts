export const DATABASE_NAME = 'little-zhuyin-adventurer';
export const DATABASE_VERSION = 3;
export const RESULT_STORE = 'gameResults';
export const PROFILE_STORE = 'playerProfiles';
export const SETTINGS_STORE = 'appSettings';

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RESULT_STORE)) {
        const resultStore = database.createObjectStore(RESULT_STORE, { keyPath: 'id' });
        resultStore.createIndex('profileId', 'profileId', { unique: false });
      }
      if (!database.objectStoreNames.contains(PROFILE_STORE)) {
        const profileStore = database.createObjectStore(PROFILE_STORE, { keyPath: 'id' });
        profileStore.createIndex('normalizedName', 'normalizedName', { unique: true });
      }
      if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
        database.createObjectStore(SETTINGS_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('無法開啟玩家資料庫'));
    request.onblocked = () => reject(new Error('玩家資料庫正在被舊版本使用'));
  });
}

export function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('資料庫操作失敗'));
    transaction.onabort = () => reject(transaction.error ?? new Error('資料庫操作已取消'));
  });
}

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('資料庫操作失敗'));
  });
}
