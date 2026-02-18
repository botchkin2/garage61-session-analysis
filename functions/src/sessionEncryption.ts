/**
 * Encrypt/decrypt OAuth tokens at rest in Firestore.
 * Uses AES-256-GCM so a Firestore dump doesn't expose Garage 61 tokens.
 * Key is derived from SESSION_ENCRYPTION_KEY secret (any length) via SHA-256.
 */
import * as crypto from 'crypto';

const ALG = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function deriveKey(secret: string): Buffer {
  if (secret.length === 0)
    throw new Error('SESSION_ENCRYPTION_KEY must be non-empty');
  return crypto.createHash('sha256').update(secret, 'utf8').digest();
}

/**
 * Encrypt a token for storage. Returns base64(IV || ciphertext || tag).
 */
export function encryptToken(plaintext: string, encryptionKey: string): string {
  const key = deriveKey(encryptionKey);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALG, key, iv, {authTagLength: TAG_LEN});
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, tag]).toString('base64');
}

/**
 * Decrypt a token from storage. Input is base64(IV || ciphertext || tag).
 */
export function decryptToken(
  ciphertextB64: string,
  encryptionKey: string,
): string {
  const key = deriveKey(encryptionKey);
  const buf = Buffer.from(ciphertextB64, 'base64');
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error('Invalid encrypted token length');
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const encrypted = buf.subarray(IV_LEN, buf.length - TAG_LEN);
  const decipher = crypto.createDecipheriv(ALG, key, iv, {
    authTagLength: TAG_LEN,
  });
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}

export function isEncryptionConfigured(
  encryptionKey: string | undefined,
): boolean {
  return typeof encryptionKey === 'string' && encryptionKey.length > 0;
}
