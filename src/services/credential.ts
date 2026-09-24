export interface PasswordCredential {
  scheme: 'pbkdf2-sha256';
  iterations: number;
  salt: string;
  hash: string;
}

const DEFAULT_ITERATIONS = 150_000;

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

async function derive(
  value: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number
): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(value),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
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

export async function createCredential(
  value: string,
  iterations = DEFAULT_ITERATIONS
): Promise<PasswordCredential> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(value, salt, iterations);
  return {
    scheme: 'pbkdf2-sha256',
    iterations,
    salt: bytesToBase64(salt),
    hash: bytesToBase64(hash)
  };
}

export async function verifyCredential(
  value: string,
  credential: PasswordCredential
): Promise<boolean> {
  const actual = await derive(
    value,
    base64ToBytes(credential.salt),
    credential.iterations
  );
  return constantTimeEqual(actual, base64ToBytes(credential.hash));
}
