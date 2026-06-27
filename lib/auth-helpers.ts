import { hash, verify } from '@node-rs/argon2';
import { totp } from 'otplib';
import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';

const ARGON2_OPTS = {
  memoryCost: 65536,  // 64 MB
  timeCost: 3,
  parallelism: 4,
};

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, ARGON2_OPTS);
}

export async function verifyPasswordHash(plain: string, hashed: string): Promise<boolean> {
  return verify(hashed, plain);
}

export function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ─── TOTP ────────────────────────────────────────────────────────────────────

totp.options = { step: 30, digits: 6 };

export function generateTotpSecret(): string {
  return randomBytes(20).toString('base32').replace(/=/g, '');
}

export function verifyTotpCode(secret: string, code: string): boolean {
  return totp.check(code, secret);
}

export function getTotpUri(email: string, secret: string): string {
  const issuer = process.env.TOTP_ISSUER ?? 'Century Financial';
  return totp.keyuri(email, issuer, secret);
}

// ─── TOTP secret encryption (AES-256-GCM) ────────────────────────────────────

function getEncKey(): Buffer {
  const hex = process.env.TOTP_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) throw new Error('TOTP_ENCRYPTION_KEY must be 64 hex chars');
  return Buffer.from(hex, 'hex');
}

export function encryptTotpSecret(secret: string): string {
  const key = getEncKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}.${encrypted.toString('hex')}.${tag.toString('hex')}`;
}

export function decryptTotpSecret(stored: string): string {
  const key = getEncKey();
  const [ivHex, encHex, tagHex] = stored.split('.');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

// ─── Password policy ─────────────────────────────────────────────────────────

export interface PolicyResult { ok: boolean; error?: string }

export function checkPasswordPolicy(password: string): PolicyResult {
  if (password.length < 12) return { ok: false, error: 'Password must be at least 12 characters.' };
  if (!/[A-Z]/.test(password)) return { ok: false, error: 'Password must contain at least one uppercase letter.' };
  if (!/[a-z]/.test(password)) return { ok: false, error: 'Password must contain at least one lowercase letter.' };
  if (!/[0-9]/.test(password)) return { ok: false, error: 'Password must contain at least one number.' };
  if (!/[^A-Za-z0-9]/.test(password)) return { ok: false, error: 'Password must contain at least one special character.' };
  return { ok: true };
}

export const PASSWORD_EXPIRY_DAYS = 90;
export const PASSWORD_HISTORY_LIMIT = 10;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES_TIER1 = 15;   // after 5 failures
export const LOCKOUT_MINUTES_TIER2 = 60;   // after 10 failures
