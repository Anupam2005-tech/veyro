import type { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { sendError, sendSuccess } from '../../shared/http/response.js';
import {
  assertAssignedDriver,
  buildRtdbLocationPath,
  isImplausibleJump,
  validateLocationSample,
} from './location.service.js';

interface VerifiedLocals {
  verifiedDriverId?: string;
  assignedDriverId?: string;
  previousSample?: { lat: number; lng: number; timestamp: Date };
}

/**
 * POST /api/v1/trips/:tripId/location
 * TODO(BE-001/BE-016): authenticate + load authoritative trip assignment
 * into res.locals.assignedDriverId. Writes go to RTDB via Admin SDK in the
 * route owner (not implemented here — service returns the validated payload
 * and path). Until then, unauthenticated callers receive 401.
 */
export function postTripLocation(req: Request, res: Response): Response {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Invalid location sample.', 'VALIDATION_ERROR', 400);
  }

  const locals = res.locals as VerifiedLocals;
  if (!locals.verifiedDriverId) {
    return sendError(res, 'Authentication required.', 'AUTH_REQUIRED', 401);
  }

  const tripId =
    typeof req.params.tripId === 'string' ? req.params.tripId : '';
  const body = req.body as {
    lat: number;
    lng: number;
    accuracyM: number;
    timestamp: string;
  };

  try {
    if (locals.assignedDriverId) {
      assertAssignedDriver(locals.assignedDriverId, locals.verifiedDriverId);
    }
    const validated = validateLocationSample(
      {
        tripId,
        driverId: locals.verifiedDriverId,
        lat: Number(body.lat),
        lng: Number(body.lng),
        accuracyM: Number(body.accuracyM),
        timestamp: new Date(body.timestamp),
      },
      new Date(),
    );
    if (
      locals.previousSample &&
      isImplausibleJump(locals.previousSample, validated)
    ) {
      return sendError(
        res,
        'Location sample rejected as implausible.',
        'LOCATION_REJECTED',
        422,
      );
    }
    return sendSuccess(
      res,
      {
        path: buildRtdbLocationPath(validated.tripId),
        lat: validated.lat,
        lng: validated.lng,
        accuracyM: validated.accuracyM,
        updatedAt: validated.timestamp.toISOString(),
        stale: validated.stale,
      },
      validated.stale
        ? 'Location accepted but marked stale.'
        : 'Location accepted.',
    );
  } catch (err) {
    const message =
      err instanceof RangeError ? err.message : 'Invalid location sample.';
    return sendError(res, message, 'VALIDATION_ERROR', 400);
  }
}
