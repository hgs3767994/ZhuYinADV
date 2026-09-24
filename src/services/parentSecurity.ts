import { createCredential, verifyCredential, type PasswordCredential } from './credential';
import { openDatabase, requestResult, SETTINGS_STORE } from './database';

const PARENT_SECURITY_ID = 'parent-security';
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30_000;
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

interface ParentSecurityRecord {
  id: typeof PARENT_SECURITY_ID;
  pinCredential: PasswordCredential;
  recoveryCredential: PasswordCredential;
  failedAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParentPinResult {
  ok: boolean;
  remainingAttempts: number;
  lockedUntil: string | null;
}

export interface ParentSecurityService {
  isConfigured(): Promise<boolean>;
  setup(pin: string): Promise<string>;
  verifyPin(pin: string): Promise<ParentPinResult>;
  changePin(currentPin: string, newPin: string): Promise<ParentPinResult>;
  resetWithRecovery(recoveryCode: string, newPin: string): Promise<string>;
}

function validatePin(pin: string): void {
  if (!/^\d{6}$/.test(pin)) throw new Error('家長 PIN 必須是 6 位數字');
}

function generateRecoveryCode(): string {
  const random = crypto.getRandomValues(new Uint8Array(16));
  const characters = Array.from(random, (value) =>
    RECOVERY_ALPHABET[value % RECOVERY_ALPHABET.length]
  ).join('');
  return characters.match(/.{1,4}/g)?.join('-') ?? characters;
}

function normalizeRecoveryCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

class IndexedDbParentSecurityService implements ParentSecurityService {
  async isConfigured(): Promise<boolean> {
    return (await this.read()) !== undefined;
  }

  async setup(pin: string): Promise<string> {
    validatePin(pin);
    if (await this.isConfigured()) throw new Error('家長 PIN 已經設定完成');
    const recoveryCode = generateRecoveryCode();
    const [pinCredential, recoveryCredential] = await Promise.all([
      createCredential(pin),
      createCredential(normalizeRecoveryCode(recoveryCode))
    ]);
    const now = new Date().toISOString();
    await this.write({
      id: PARENT_SECURITY_ID,
      pinCredential,
      recoveryCredential,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: now,
      updatedAt: now
    });
    return recoveryCode;
  }

  async verifyPin(pin: string): Promise<ParentPinResult> {
    const record = await this.read();
    if (!record) throw new Error('尚未設定家長 PIN');
    const now = Date.now();
    const lockedUntilMs = record.lockedUntil ? new Date(record.lockedUntil).getTime() : 0;
    if (lockedUntilMs > now) {
      return { ok: false, remainingAttempts: 0, lockedUntil: record.lockedUntil };
    }

    if (await verifyCredential(pin, record.pinCredential)) {
      record.failedAttempts = 0;
      record.lockedUntil = null;
      record.updatedAt = new Date().toISOString();
      await this.write(record);
      return { ok: true, remainingAttempts: MAX_FAILED_ATTEMPTS, lockedUntil: null };
    }

    record.failedAttempts = lockedUntilMs > 0 && lockedUntilMs <= now
      ? 1
      : record.failedAttempts + 1;
    if (record.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      record.failedAttempts = 0;
      record.lockedUntil = new Date(now + LOCK_DURATION_MS).toISOString();
    } else {
      record.lockedUntil = null;
    }
    record.updatedAt = new Date().toISOString();
    await this.write(record);
    return {
      ok: false,
      remainingAttempts: record.lockedUntil
        ? 0
        : MAX_FAILED_ATTEMPTS - record.failedAttempts,
      lockedUntil: record.lockedUntil
    };
  }

  async changePin(currentPin: string, newPin: string): Promise<ParentPinResult> {
    validatePin(currentPin);
    validatePin(newPin);
    const verification = await this.verifyPin(currentPin);
    if (!verification.ok) return verification;

    const record = await this.read();
    if (!record) throw new Error('尚未設定家長 PIN');
    if (await verifyCredential(newPin, record.pinCredential)) {
      throw new Error('新的家長 PIN 不可與目前 PIN 相同');
    }

    record.pinCredential = await createCredential(newPin);
    record.failedAttempts = 0;
    record.lockedUntil = null;
    record.updatedAt = new Date().toISOString();
    await this.write(record);
    return { ok: true, remainingAttempts: MAX_FAILED_ATTEMPTS, lockedUntil: null };
  }

  async resetWithRecovery(recoveryCode: string, newPin: string): Promise<string> {
    validatePin(newPin);
    const record = await this.read();
    if (!record) throw new Error('尚未設定家長 PIN');
    const normalizedCode = normalizeRecoveryCode(recoveryCode);
    if (!normalizedCode || !await verifyCredential(normalizedCode, record.recoveryCredential)) {
      throw new Error('家長復原碼不正確');
    }

    const nextRecoveryCode = generateRecoveryCode();
    const [pinCredential, recoveryCredential] = await Promise.all([
      createCredential(newPin),
      createCredential(normalizeRecoveryCode(nextRecoveryCode))
    ]);
    record.pinCredential = pinCredential;
    record.recoveryCredential = recoveryCredential;
    record.failedAttempts = 0;
    record.lockedUntil = null;
    record.updatedAt = new Date().toISOString();
    await this.write(record);
    return nextRecoveryCode;
  }

  private async read(): Promise<ParentSecurityRecord | undefined> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(SETTINGS_STORE, 'readonly');
      return await requestResult(
        transaction.objectStore(SETTINGS_STORE).get(PARENT_SECURITY_ID) as
          IDBRequest<ParentSecurityRecord | undefined>
      );
    } finally {
      database.close();
    }
  }

  private async write(record: ParentSecurityRecord): Promise<void> {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(SETTINGS_STORE, 'readwrite');
      await requestResult(transaction.objectStore(SETTINGS_STORE).put(record));
    } finally {
      database.close();
    }
  }
}

export const parentSecurity: ParentSecurityService = new IndexedDbParentSecurityService();
