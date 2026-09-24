import { createCredential, verifyCredential, type PasswordCredential } from './credential';
import {
  openDatabase,
  PROFILE_STORE,
  requestResult,
  RESULT_STORE,
  transactionDone
} from './database';

const PASSWORD_MIN_LENGTH = 4;
const PASSWORD_MAX_LENGTH = 64;
const PROFILE_NAME_MAX_LENGTH = 20;
export const DELETION_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1_000;
export const GUEST_PROFILE_ID = 'guest-session';

export interface AvatarRecipe {
  version: 1;
  seed: string;
}

export interface PlayerProfile {
  id: string;
  name: string;
  avatar: AvatarRecipe;
  isGuest: boolean;
  createdAt: string;
  scheduledDeletionAt?: string;
}

interface StoredPlayerProfile extends PlayerProfile {
  normalizedName: string;
  credential: PasswordCredential;
}

export interface ProfileRepository {
  list(): Promise<PlayerProfile[]>;
  listManaged(): Promise<PlayerProfile[]>;
  create(name: string, password: string): Promise<PlayerProfile>;
  authenticate(profileId: string, password: string): Promise<PlayerProfile | null>;
  resetPassword(profileId: string, password: string): Promise<void>;
  scheduleDeletion(profileId: string, confirmationName: string): Promise<void>;
  restore(profileId: string): Promise<void>;
}

export function normalizeProfileName(name: string): string {
  return name
    .trim()
    .normalize('NFKC')
    .replace(/\s+/gu, ' ')
    .toLocaleLowerCase('zh-TW');
}

export function validateProfileName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('請輸入帳號名稱');
  if (/\p{C}/u.test(trimmed)) throw new Error('帳號名稱不能包含看不見的控制字元');
  if (!/[\p{L}\p{N}]/u.test(trimmed)) {
    throw new Error('帳號名稱至少需要一個中文、英文字母或數字');
  }
  const segmenter = new Intl.Segmenter('zh-TW', { granularity: 'grapheme' });
  const length = Array.from(segmenter.segment(trimmed)).length;
  if (length > PROFILE_NAME_MAX_LENGTH) throw new Error('帳號名稱最多 20 個字元');
  return trimmed;
}

function validatePassword(password: string): void {
  if (password.length < PASSWORD_MIN_LENGTH) throw new Error('密碼至少需要 4 個字元');
  if (password.length > PASSWORD_MAX_LENGTH) throw new Error('密碼最多 64 個字元');
}

function publicProfile(profile: StoredPlayerProfile): PlayerProfile {
  return {
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    isGuest: false,
    createdAt: profile.createdAt,
    scheduledDeletionAt: profile.scheduledDeletionAt
  };
}

export function createGuestProfile(): PlayerProfile {
  return {
    id: GUEST_PROFILE_ID,
    name: '小小訪客',
    avatar: { version: 1, seed: 'guest' },
    isGuest: true,
    createdAt: new Date().toISOString()
  };
}

function deleteResultsByProfile(
  transaction: IDBTransaction,
  profileId: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = transaction
      .objectStore(RESULT_STORE)
      .index('profileId')
      .openCursor(IDBKeyRange.only(profileId));
    request.onerror = () => reject(request.error ?? new Error('無法刪除帳號紀錄'));
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve();
        return;
      }
      cursor.delete();
      cursor.continue();
    };
  });
}

class IndexedDbProfileRepository implements ProfileRepository {
  async list(): Promise<PlayerProfile[]> {
    const profiles = await this.readAllAndPurgeExpired();
    return profiles.filter((profile) => !profile.scheduledDeletionAt).map(publicProfile);
  }

  async listManaged(): Promise<PlayerProfile[]> {
    return (await this.readAllAndPurgeExpired()).map(publicProfile);
  }

  async create(name: string, password: string): Promise<PlayerProfile> {
    const displayName = validateProfileName(name);
    validatePassword(password);
    const normalizedName = normalizeProfileName(displayName);
    const credential = await createCredential(password);

    const database = await openDatabase();
    try {
      const transaction = database.transaction(PROFILE_STORE, 'readwrite');
      const store = transaction.objectStore(PROFILE_STORE);
      const existing = await requestResult(store.getAll() as IDBRequest<StoredPlayerProfile[]>);
      if (existing.some((profile) => normalizeProfileName(profile.name) === normalizedName)) {
        throw new Error('這個帳號名稱已經有人使用');
      }

      const createdAt = new Date().toISOString();
      const profile: StoredPlayerProfile = {
        id: crypto.randomUUID(),
        name: displayName,
        normalizedName,
        avatar: { version: 1, seed: crypto.randomUUID() },
        isGuest: false,
        createdAt,
        credential
      };
      await requestResult(store.add(profile));
      return publicProfile(profile);
    } finally {
      database.close();
    }
  }

  async authenticate(profileId: string, password: string): Promise<PlayerProfile | null> {
    const profile = await this.getStored(profileId);
    if (!profile || profile.scheduledDeletionAt) return null;
    return await verifyCredential(password, profile.credential) ? publicProfile(profile) : null;
  }

  async resetPassword(profileId: string, password: string): Promise<void> {
    validatePassword(password);
    const credential = await createCredential(password);
    const database = await openDatabase();
    try {
      const transaction = database.transaction(PROFILE_STORE, 'readwrite');
      const store = transaction.objectStore(PROFILE_STORE);
      const profile = await requestResult(
        store.get(profileId) as IDBRequest<StoredPlayerProfile | undefined>
      );
      if (!profile || profile.scheduledDeletionAt) throw new Error('找不到這個帳號');
      profile.credential = credential;
      await requestResult(store.put(profile));
    } finally {
      database.close();
    }
  }

  async scheduleDeletion(profileId: string, confirmationName: string): Promise<void> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(PROFILE_STORE, 'readwrite');
      const store = transaction.objectStore(PROFILE_STORE);
      const profile = await requestResult(
        store.get(profileId) as IDBRequest<StoredPlayerProfile | undefined>
      );
      if (!profile) throw new Error('找不到這個帳號');
      if (confirmationName.trim() !== profile.name) throw new Error('輸入的帳號名稱不正確');
      profile.scheduledDeletionAt = new Date(Date.now() + DELETION_GRACE_PERIOD_MS).toISOString();
      await requestResult(store.put(profile));
    } finally {
      database.close();
    }
  }

  async restore(profileId: string): Promise<void> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(PROFILE_STORE, 'readwrite');
      const store = transaction.objectStore(PROFILE_STORE);
      const profile = await requestResult(
        store.get(profileId) as IDBRequest<StoredPlayerProfile | undefined>
      );
      if (!profile) throw new Error('帳號已經永久刪除');
      delete profile.scheduledDeletionAt;
      await requestResult(store.put(profile));
    } finally {
      database.close();
    }
  }

  private async getStored(profileId: string): Promise<StoredPlayerProfile | undefined> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(PROFILE_STORE, 'readonly');
      return await requestResult(
        transaction.objectStore(PROFILE_STORE).get(profileId) as
          IDBRequest<StoredPlayerProfile | undefined>
      );
    } finally {
      database.close();
    }
  }

  private async readAllAndPurgeExpired(): Promise<StoredPlayerProfile[]> {
    const database = await openDatabase();
    let profiles: StoredPlayerProfile[];
    try {
      const transaction = database.transaction(PROFILE_STORE, 'readonly');
      profiles = await requestResult(
        transaction.objectStore(PROFILE_STORE).getAll() as IDBRequest<StoredPlayerProfile[]>
      );
    } finally {
      database.close();
    }

    const now = Date.now();
    const expired = profiles.filter((profile) =>
      profile.scheduledDeletionAt && new Date(profile.scheduledDeletionAt).getTime() <= now
    );
    for (const profile of expired) await this.purge(profile.id);
    const expiredIds = new Set(expired.map((profile) => profile.id));
    return profiles
      .filter((profile) => !expiredIds.has(profile.id))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  private async purge(profileId: string): Promise<void> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction([PROFILE_STORE, RESULT_STORE], 'readwrite');
      const done = transactionDone(transaction);
      transaction.objectStore(PROFILE_STORE).delete(profileId);
      await deleteResultsByProfile(transaction, profileId);
      await done;
    } finally {
      database.close();
    }
  }
}

export const profileRepository: ProfileRepository = new IndexedDbProfileRepository();
