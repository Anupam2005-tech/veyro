export type NotificationType =
  | 'OFFER_RECEIVED'
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
  | 'ACCOUNT_STATUS'
  | 'SHARE_REVOKED';

export type PushStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'UNKNOWN' | 'SKIPPED_IN_APP';

export interface NotificationRecord {
  readonly id: string;
  readonly userId: string;
  readonly eventId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body: string;
  readonly createdAt: Date;
  readonly readAt: Date | null;
}

export type BrowserPermission = 'granted' | 'denied' | 'default';

export const NOTIFICATION_DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;
