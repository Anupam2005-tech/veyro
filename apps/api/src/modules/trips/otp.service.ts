import { createHash, randomInt } from 'node:crypto';

export interface OtpRecord {
  readonly hash: string;
  readonly expiresAt: Date;
  readonly attempts: number;
}

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export function hashOtp(code: string): string {
  if (!/^\d{4,6}$/.test(code)) throw new RangeError('OTP must be 4–6 digits');
  return createHash('sha256').update(code).digest('hex');
}

export function generateOtp(now = new Date()): { code: string; record: OtpRecord } {
  const code = String(randomInt(1000, 10000));
  return {
    code,
    record: {
      hash: hashOtp(code),
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      attempts: 0,
    },
  };
}

/** Single-use, expiry- and attempt-limited verification. */
export function verifyOtp(record: OtpRecord, code: string, now = new Date()): { ok: boolean; attempts: number } {
  if (now.getTime() > record.expiresAt.getTime()) return { ok: false, attempts: record.attempts };
  if (record.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, attempts: record.attempts };
  const match = hashOtp(code) === record.hash;
  return { ok: match, attempts: record.attempts + 1 };
}
