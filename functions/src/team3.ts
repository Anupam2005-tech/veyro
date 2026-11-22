import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { selectStaleRtdbNodes } from '@veyro/api/trips/location-cleanup.service';
import { buildNotificationRecord } from '@veyro/api/notifications/notification.service';

/**
 * Team 3 background handlers (BE-036/BE-037).
 * Pure selectors/services are implemented and unit-tested.
 * TODO(BE-FND-003): central Admin SDK init; TODO(runtime): service identity.
 * These handlers log due paths/events and perform no writes until
 * privileged access is explicitly approved.
 */

export const pruneStalePresence = onSchedule(
  {
    schedule: 'every 5 minutes',
    region: 'asia-east2',
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  async () => {
    // Placeholder input: real listing comes from Admin SDK RTDB scan.
    const due = selectStaleRtdbNodes([], new Date());
    console.log(`[Team3] RTDB prune check: ${due.length} paths due`);
  },
);

export const dispatchNotifications = onDocumentCreated(
  'notificationQueue/{eventId}',
  async (event) => {
    const data = event.data?.data() as
      | {
          type?: 'OFFER_RECEIVED' | 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'TRIP_STARTED' | 'TRIP_COMPLETED' | 'ACCOUNT_STATUS' | 'SHARE_REVOKED';
          userId?: string;
          title?: string;
          body?: string;
        }
      | undefined;
    if (!data?.userId || !data?.title || !data?.body || !data?.type) {
      console.warn('[Team3] Dropping malformed notification event');
      return;
    }
    const record = buildNotificationRecord(
      {
        eventId: event.params.eventId,
        type: data.type,
        userId: data.userId,
        title: data.title,
        body: data.body,
      },
      new Set(),
    );
    // TODO: Firestore write + FCM send via Admin SDK once approved.
    console.log(`[Team3] Notification job ready: ${record?.id}`);
  },
);
