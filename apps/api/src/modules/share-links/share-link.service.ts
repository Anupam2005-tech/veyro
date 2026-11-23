import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import {
  SHARE_LINK_TTL_MS,
  type ShareLinkRecord,
} from './share-link.types.js';

function requireId(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim() || value.includes('/')) {
    throw new RangeError(`${name} must be a non-empty path-safe string`);
  }
  return value.trim();
}

export function hashShareToken(token: string): string {
  if (typeof token !== 'string' || !token.trim()) {
    throw new RangeError('Share token must be a non-empty string');
  }
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Creates a share-link record + returns the raw token ONCE for the customer.
 * Store only `tokenHash`; never log or persist the raw token.
 * Expires at trip completion (enforced by caller via Team 2 trip state),
 * at `expiresAt`, or on customer revoke — whichever is first.
 */
export function createShareLink(
  tripId: string,
  createdBy: string,
  now: Date = new Date(),
  id: string = randomBytes(16).toString('hex'),
): { record: ShareLinkRecord; token: string } {
  const validTrip = requireId(tripId, 'Trip ID');
  const owner = requireId(createdBy, 'Creator UID');
  const linkId = requireId(id, 'Share link ID');
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs) || Number.isNaN(nowMs)) {
    throw new RangeError('Reference time must be a valid date');
  }
  const token = randomBytes(32).toString('hex');
  return {
    token,
    record: {
      id: linkId,
      tripId: validTrip,
      tokenHash: hashShareToken(token),
      createdBy: owner,
      createdAt: new Date(nowMs),
      expiresAt: new Date(nowMs + SHARE_LINK_TTL_MS),
      revokedAt: null,
    },
  };
}

export interface ShareAccessCheck {
  readonly tripCompleted: boolean;
  readonly now?: Date;
}

/**
 * Active = not revoked, not past expiresAt, trip not completed.
 * Caller must also enforce: Firebase-authenticated session + token match.
 */
export function isShareLinkActive(
  record: ShareLinkRecord,
  check: ShareAccessCheck,
): boolean {
  if (record.revokedAt !== null) {
    return false;
  }
  const nowMs = (check.now ?? new Date()).getTime();
  if (record.expiresAt.getTime() <= nowMs) {
    return false;
  }
  if (check.tripCompleted) {
    return false;
  }
  return true;
}

/** Constant-time verification of a presented token against the stored hash. */
export function verifyShareToken(
  presentedToken: unknown,
  storedHash: unknown,
): boolean {
  if (typeof presentedToken !== 'string' || typeof storedHash !== 'string') {
    return false;
  }
  if (!/^[0-9a-f]{64}$/i.test(storedHash)) {
    return false;
  }
  let presentedHash: Buffer;
  let expected: Buffer;
  try {
    presentedHash = Buffer.from(hashShareToken(presentedToken), 'hex');
    expected = Buffer.from(storedHash, 'hex');
  } catch {
    return false;
  }
  if (presentedHash.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(presentedHash, expected);
}

export function revokeShareLink(
  record: ShareLinkRecord,
  now: Date = new Date(),
): ShareLinkRecord {
  if (record.revokedAt !== null) {
    throw new Error('Share link is already revoked');
  }
  return { ...record, revokedAt: new Date(now.getTime()) };
}
