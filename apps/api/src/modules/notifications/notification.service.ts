import {
  type BrowserPermission,
  type NotificationRecord,
  type NotificationType,
  type PushStatus,
} from './notification.types.js';

function requireId(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim() || value.includes('/')) {
    throw new RangeError(`${name} must be a non-empty path-safe string`);
  }
  return value.trim();
}

export interface DomainEvent {
  readonly eventId: string;
  readonly type: NotificationType;
  readonly userId: string;
  readonly title: string;
  readonly body: string;
}

/**
 * Builds a Firestore notification record for a Team 2 domain event.
 * Returns null when the event was already seen (idempotent handler).
 * Delivery failure must never roll back the booking/payment (Team 2 owns state).
 */
export function buildNotificationRecord(
  event: DomainEvent,
  seenEventIds: ReadonlySet<string>,
  now: Date = new Date(),
  id?: string,
): NotificationRecord | null {
  const eventId = requireId(event.eventId, 'Event ID');
  if (seenEventIds.has(eventId)) {
    return null;
  }
  const userId = requireId(event.userId, 'User ID');
  if (typeof event.title !== 'string' || !event.title.trim()) {
    throw new RangeError('Notification title is required');
  }
  if (typeof event.body !== 'string' || !event.body.trim()) {
    throw new RangeError('Notification body is required');
  }
  return {
    id: id ?? eventId,
    userId,
    eventId,
    type: event.type,
    title: event.title.trim(),
    body: event.body.trim(),
    createdAt: new Date(now.getTime()),
    readAt: null,
  };
}

/** FCM tokens are opaque; validate shape only, never log the value. */
export function isValidFcmToken(token: unknown): boolean {
  return (
    typeof token === 'string' &&
    token.length >= 32 &&
    token.length <= 4096 &&
    !/\s/.test(token)
  );
}

/**
 * Push when permission is granted + token present; otherwise in-app fallback.
 * SKIPPED_IN_APP keeps an auditable delivery state instead of fake SENT.
 */
export function decidePushDelivery(
  permission: BrowserPermission,
  hasToken: boolean,
): PushStatus {
  if (permission === 'granted' && hasToken) {
    return 'QUEUED';
  }
  return 'SKIPPED_IN_APP';
}

/** Display helper: never claim SENT without a confirmed channel. */
export function describeDelivery(status: PushStatus, demoMode: boolean): string {
  if (status === 'SENT' && !demoMode) {
    return 'Sent';
  }
  if (status === 'SENT' && demoMode) {
    return 'Not sent (test mode)';
  }
  if (status === 'SKIPPED_IN_APP') {
    return 'Available in-app';
  }
  return status;
}
