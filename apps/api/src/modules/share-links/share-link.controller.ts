import type { Request, Response } from 'express';
import { sendError, sendSuccess } from '../../shared/http/response.js';
import {
  createShareLink,
  isShareLinkActive,
  revokeShareLink,
  verifyShareToken,
} from './share-link.service.js';
import type { ShareLinkRecord } from './share-link.types.js';

interface VerifiedLocals {
  verifiedUserId?: string;
  /** Loaded by future Team 2 trip-ownership check. */
  isTripOwner?: boolean;
  shareRecord?: ShareLinkRecord;
  tripCompleted?: boolean;
}

/**
 * POST /api/v1/trips/:tripId/share-links — customer creates a link.
 * GET  /api/v1/share/:token — authenticated recipient validates token.
 * DELETE /api/v1/trips/:tripId/share-links/:shareId — customer revokes.
 * TODO(BE-001/BE-016): authenticate + trip ownership + Firestore persistence.
 */
export function postShareLink(req: Request, res: Response): Response {
  const locals = res.locals as VerifiedLocals;
  if (!locals.verifiedUserId) {
    return sendError(res, 'Authentication required.', 'AUTH_REQUIRED', 401);
  }
  const tripId = typeof req.params.tripId === 'string' ? req.params.tripId : '';
  try {
    const { record, token } = createShareLink(tripId, locals.verifiedUserId);
    return sendSuccess(
      res,
      {
        id: record.id,
        tripId: record.tripId,
        expiresAt: record.expiresAt.toISOString(),
        // Raw token is returned ONCE; only the hash is stored.
        token,
      },
      'Share link created. Share the token; only its hash is stored.',
      201,
    );
  } catch (err) {
    const message =
      err instanceof RangeError ? err.message : 'Unable to create share link.';
    return sendError(res, message, 'VALIDATION_ERROR', 400);
  }
}

export function getShareByToken(req: Request, res: Response): Response {
  const locals = res.locals as VerifiedLocals;
  if (!locals.verifiedUserId) {
    return sendError(res, 'Authentication required.', 'AUTH_REQUIRED', 401);
  }
  const token = typeof req.params.token === 'string' ? req.params.token : '';
  const record = locals.shareRecord;
  if (!record || !verifyShareToken(token, record.tokenHash)) {
    return sendError(res, 'Share link not found.', 'SHARE_NOT_FOUND', 404);
  }
  const active = isShareLinkActive(record, {
    tripCompleted: locals.tripCompleted ?? false,
  });
  if (!active) {
    return sendError(res, 'Share link expired or revoked.', 'SHARE_INACTIVE', 410);
  }
  return sendSuccess(
    res,
    { tripId: record.tripId, expiresAt: record.expiresAt.toISOString() },
    'Share link is valid. Read-only trip view authorized.',
  );
}

export function deleteShareLink(_req: Request, res: Response): Response {
  const locals = res.locals as VerifiedLocals;
  if (!locals.verifiedUserId) {
    return sendError(res, 'Authentication required.', 'AUTH_REQUIRED', 401);
  }
  const record = locals.shareRecord;
  if (!record) {
    return sendError(res, 'Share link not found.', 'SHARE_NOT_FOUND', 404);
  }
  try {
    const revoked = revokeShareLink(record);
    return sendSuccess(
      res,
      { id: revoked.id, revokedAt: revoked.revokedAt?.toISOString() },
      'Share link revoked.',
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unable to revoke share link.';
    return sendError(res, message, 'SHARE_CONFLICT', 409);
  }
}
