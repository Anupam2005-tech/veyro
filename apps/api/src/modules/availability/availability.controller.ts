import type { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { sendError, sendSuccess } from '../../shared/http/response.js';
import {
  evaluateOfferEligibility,
  parseAvailabilityStatus,
} from './availability.service.js';
import type { AvailabilitySignals } from './availability.types.js';

interface VerifiedLocals {
  verifiedDriverId?: string;
  verifiedAccount?: {
    approvalStatus: 'APPROVED' | 'PENDING_REVIEW' | 'NEEDS_CHANGES' | 'REJECTED' | 'DEACTIVATED' | 'SUSPENDED';
    isSuspended: boolean;
  };
}

/**
 * PATCH /api/v1/drivers/availability
 * TODO(BE-001/BE-002): insert authenticate + requireRole(DRIVER) + AppCheck
 * before this controller; they must populate res.locals.verifiedDriverId
 * and res.locals.verifiedAccount from Firestore. Until then, unauthenticated
 * callers receive 401 and no state changes.
 */
export function patchAvailability(req: Request, res: Response): Response {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(
      res,
      'Invalid availability request.',
      'VALIDATION_ERROR',
      400,
      errors.array().map((e) => ({
        field: 'status',
        message: e.msg as string,
      })),
    );
  }

  const locals = res.locals as VerifiedLocals;
  if (!locals.verifiedDriverId || !locals.verifiedAccount) {
    return sendError(
      res,
      'Authentication required.',
      'AUTH_REQUIRED',
      401,
    );
  }

  let status;
  try {
    status = parseAvailabilityStatus(req.body?.status);
  } catch {
    return sendError(
      res,
      'Availability status must be ONLINE or OFFLINE.',
      'VALIDATION_ERROR',
      400,
    );
  }

  // Presence/trip/area/vehicle signals come from verified server state
  // (BE-007/BE-016/BE-019). The body carries status only.
  const signals = (req.body?.signals ?? {}) as Partial<AvailabilitySignals>;
  const result = evaluateOfferEligibility(
    locals.verifiedAccount,
    {
      hasLocationPermission: signals.hasLocationPermission ?? false,
      lastLocationAt: signals.lastLocationAt ?? null,
      hasActiveTrip: signals.hasActiveTrip ?? false,
      serviceAreaIncludesPickup: signals.serviceAreaIncludesPickup ?? false,
      supportsVehicle: signals.supportsVehicle ?? false,
      meetsLeadTime: signals.meetsLeadTime ?? false,
    },
    status,
    new Date(),
  );

  if (status === 'OFFLINE') {
    return sendSuccess(
      res,
      { driverId: locals.verifiedDriverId, status, eligible: false },
      'Driver is offline.',
    );
  }

  if (!result.eligible) {
    return sendError(
      res,
      'Driver is not eligible to go online.',
      'AVAILABILITY_BLOCKED',
      422,
      result.reasons.map((reason) => ({ message: reason })),
    );
  }

  return sendSuccess(
    res,
    { driverId: locals.verifiedDriverId, status, eligible: true },
    'Driver is online and eligible for offers.',
  );
}
