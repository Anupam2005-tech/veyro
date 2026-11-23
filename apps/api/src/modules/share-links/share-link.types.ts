export interface ShareLinkRecord {
  readonly id: string;
  readonly tripId: string;
  readonly tokenHash: string;
  readonly createdBy: string;
  readonly createdAt: Date;
  /** Safety cap; link also expires at trip completion and on revoke. */
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
}

/** Safety cap for share links (real expiry is trip completion / revoke). */
export const SHARE_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
