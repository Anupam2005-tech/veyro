import type { Request, Response } from 'express';
import { sendError, sendSuccess } from '../../shared/http/response.js';
import {
  buildNotificationRecord,
  decidePushDelivery,
  isValidFcmToken,
} from './notification.service.js';
import type { BrowserPermission } from './notification.types.js';

interface VerifiedLocals {
  verifiedUserId?: string;
  seenEventIds?: ReadonlySet<string>;
}

/**
 * Notification endpoints (Team 3 owned, Team 2 events consumed).
 * TODO(BE-001): authenticate; TODO(BE-002): recipient privacy checks.
 */
export function postFcmToken(req: Request, res: Response): Response {
  const locals = res.locals as VerifiedLocals;
  if (!locals.verifiedUserId) {
    return sendError(res, 'Authentication required.', 'AUTH_REQUIRED', 401);
  }
  const token = (req.body as { token?: unknown })?.token;
  if (!isValidFcmToken(token)) {
    return sendError(res, 'Invalid FCM token.', 'VALIDATION_ERROR', 400);
  }
  return sendSuccess(
    res,
    { userId: locals.verifiedUserId, registered: true },
    'FCM token registered.',
    201,
  );
}

export function postTestDelivery(req: Request, res: Response): Response {
  const locals = res.locals as VerifiedLocals;
  if (!locals.verifiedUserId) {
    return sendError(res, 'Authentication required.', 'AUTH_REQUIRED', 401);
  }
  const permission = (req.body as { permission?: BrowserPermission })
    ?.permission;
  if (permission !== 'granted' && permission !== 'denied' && permission !== 'default') {
    return sendError(res, 'Invalid permission state.', 'VALIDATION_ERROR', 400);
  }
  const hasToken = Boolean((req.body as { hasToken?: unknown })?.hasToken);
  const event = {
    eventId: `evt_${Date.now()}`,
    type: 'ACCOUNT_STATUS' as const,
    userId: locals.verifiedUserId,
    title: 'Delivery check',
    body: 'Notification channel check.',
  };
  const record = buildNotificationRecord(
    event,
    locals.seenEventIds ?? new Set(),
  );
  const delivery = decidePushDelivery(permission, hasToken);
  return sendSuccess(
    res,
    { record, delivery },
    'Delivery decision computed. Failures never roll back bookings.',
  );
}
