import { openDatabase, PROFILE_STORE, requestResult } from './database';

const PASSWORD_ITERATIONS = 150_000;
const PASSWORD_MIN_LENGTH = 4;
const PASSWORD_MAX_LENGTH = 64;

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
}

interface StoredPlayerProfile extends PlayerProfile {
  normalizedName: string;
  credential: {
    scheme: 'pbkdf2-sha256';
    iterations: number;
    salt: string;
    hash: string;
  };
}

export interface ProfileRepository {
  list(): Promise<PlayerProfile[]>;
  create(name: string, password: string): Promise<PlayerProfile>;
  authenticate(profileId: string, password: string): Promise<PlayerProfile | null>;
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('zh-TW');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function derivePassword(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<Uint8Array<ArrayBuffer>> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    passwordKey,
    256
  );
  return new Uint8Array(bits);
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

function publicProfile(profile: StoredPlayerProfile): PlayerProfile {
  return {
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    isGuest: false,
    createdAt: profile.createdAt
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

class IndexedDbProfileRepository implements ProfileRepository {
  async list(): Promise<PlayerProfile[]> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(PROFILE_STORE, 'readonly');
      const profiles = await requestResult(
        transaction.objectStore(PROFILE_STORE).getAll() as IDBRequest<StoredPlayerProfile[]>
      );
      return profiles
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
        .map(publicProfile);
    } finally {
      database.close();
    }
  }

  async create(name: string, password: string): Promise<PlayerProfile> {
    const trimmedName = name.trim().replace(/\s+/g, ' ');
    if (!trimmedName) throw new Error('請輸入帳號名稱');
    if (trimmedName.length > 20) throw new Error('帳號名稱最多 20 個字');
    if (password.length < PASSWORD_MIN_LENGTH) throw new Error('密碼至少需要 4 個字元');
    if (password.length > PASSWORD_MAX_LENGTH) throw new Error('密碼最多 64 個字元');

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derivePassword(password, salt, PASSWORD_ITERATIONS);

    const database = await openDatabase();
    try {
      const transaction = database.transaction(PROFILE_STORE, 'readwrite');
      const store = transaction.objectStore(PROFILE_STORE);
      const normalizedName = normalizeName(trimmedName);
      const duplicate = await requestResult(
        store.index('normalizedName').get(normalizedName) as IDBRequest<StoredPlayerProfile | undefined>
      );
      if (duplicate) throw new Error('這個帳號名稱已經有人使用');

      const createdAt = new Date().toISOString();
      const profile: StoredPlayerProfile = {
        id: crypto.randomUUID(),
        name: trimmedName,
        normalizedName,
        avatar: { version: 1, seed: crypto.randomUUID() },
        isGuest: false,
        createdAt,
        credential: {
          scheme: 'pbkdf2-sha256',
          iterations: PASSWORD_ITERATIONS,
          salt: bytesToBase64(salt),
          hash: bytesToBase64(hash)
        }
      };
      await requestResult(store.add(profile));
      return publicProfile(profile);
    } finally {
      database.close();
    }
  }

  async authenticate(profileId: string, password: string): Promise<PlayerProfile | null> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(PROFILE_STORE, 'readonly');
      const profile = await requestResult(
        transaction.objectStore(PROFILE_STORE).get(profileId) as
          IDBRequest<StoredPlayerProfile | undefined>
      );
      if (!profile) return null;
      const actual = await derivePassword(
        password,
        base64ToBytes(profile.credential.salt),
        profile.credential.iterations
      );
      return constantTimeEqual(actual, base64ToBytes(profile.credential.hash))
        ? publicProfile(profile)
        : null;
    } finally {
      database.close();
    }
  }
}

export const profileRepository: ProfileRepository = new IndexedDbProfileRepository();
