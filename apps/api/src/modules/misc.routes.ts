import { Router } from 'express';
import { body } from 'express-validator';
import { REPORT_CATEGORIES } from '../config/policy.js';
import { authenticate, currentUser } from '../middleware/authenticate.js';
import { db, mutate, newId, nowIso, resetDatabase } from '../store/db.js';
import { checkValidation, handle, param, rateLimit, str } from '../shared/http/handler.js';
import { sendSuccess } from '../shared/http/response.js';
import { AppError, ConflictError, ForbiddenError, NotFoundError } from '../shared/errors/errors.js';
import { ACTIVE_TRIP_STATUSES, notify } from '../services/domain.js';
import { locationView } from '../services/views.js';
import { hashShareToken, isShareLinkActive, verifyShareToken } from './share-links/share-link.service.js';
import { submitReport } from './safety/safety.service.js';

/** GET /share/:token — authenticated, read-only, minimum data (§5.11). */
export function shareRouter(): Router {
  const router = Router();
  router.get('/:token', authenticate, handle((req, res) => {
    const user = currentUser(res);
    if (!rateLimit(`share:${user.id}`, 60, 60_000)) throw new AppError('Too many requests.', 429, 'RATE_LIMITED');
    const token = param(req, 'token');
    if (!/^[0-9a-f]{64}$/i.test(token)) throw new NotFoundError('This share link is invalid or has expired.');
    const hash = hashShareToken(token);
    const link = db().shareLinks.find((l) => l.tokenHash === hash);
    if (!link || !verifyShareToken(token, link.tokenHash)) throw new NotFoundError('This share link is invalid or has expired.');
    const trip = db().trips.find((t) => t.id === link.tripId);
    const tripEnded = !trip || !ACTIVE_TRIP_STATUSES.includes(trip.status);
    const active = isShareLinkActive(
      { ...link, createdAt: new Date(link.createdAt), expiresAt: new Date(link.expiresAt), revokedAt: link.revokedAt ? new Date(link.revokedAt) : null },
      { tripCompleted: tripEnded },
    );
    if (!active || !trip) {
      return sendSuccess(res, { active: false, reason: link.revokedAt ? 'REVOKED_OR_COMPLETED' : 'EXPIRED' }, 'This trip is no longer being shared.');
    }
    const booking = db().bookings.find((b) => b.id === trip.bookingId)!;
    const driverName = db().users.find((u) => u.id === trip.driverId)?.name ?? 'Driver';
    return sendSuccess(res, {
      active: true,
      status: trip.status,
      driverFirstName: driverName.split(' ')[0],
      vehicleCategory: booking.vehicleSnapshot.category,
      pickupArea: booking.pickup.label.split(',')[0],
      destinationArea: booking.destination.label.split(',')[0],
      routePolyline: booking.routePolyline,
      location: locationView(trip.location),
      startedAt: trip.startedAt,
    }, 'Shared trip loaded.');
  }));
  return router;
}

export function notificationRouter(): Router {
  const router = Router();
  router.use(authenticate);
  router.get('/', handle((_req, res) => {
    const user = currentUser(res);
    const items = db().notifications.filter((n) => n.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
    return sendSuccess(res, items, 'Notifications loaded.');
  }));
  router.post('/read-all', handle((_req, res) => {
    const user = currentUser(res);
    mutate((data) => data.notifications.filter((n) => n.userId === user.id && !n.readAt).forEach((n) => (n.readAt = nowIso())));
    return sendSuccess(res, { ok: true }, 'All caught up.');
  }));
  return router;
}

/** Reports (§5.13): identity from session; reported party never sees the reporter. */
export function reportRouter(): Router {
  const router = Router();
  router.use(authenticate);

  router.get('/categories', handle((_req, res) => sendSuccess(res, REPORT_CATEGORIES, 'Categories loaded.')));

  router.get('/', handle((_req, res) => {
    const user = currentUser(res);
    const mine = db().reports.filter((r) => r.reporterId === user.id).map(({ reportedUserId: _r, ...r }) => r);
    return sendSuccess(res, mine, 'Reports loaded.');
  }));

  router.post(
    '/',
    body('tripId').isString().notEmpty(),
    body('category').isIn([...REPORT_CATEGORIES]).withMessage('Choose a category.'),
    body('description').isString().trim().isLength({ min: 10, max: 1000 }).withMessage('Describe what happened (10–1000 characters).'),
    checkValidation,
    handle((req, res) => {
      const user = currentUser(res);
      const trip = db().trips.find((t) => t.id === req.body.tripId);
      if (!trip || (trip.customerId !== user.id && trip.driverId !== user.id)) throw new NotFoundError('Trip not found.');
      if (db().reports.some((r) => r.tripId === trip.id && r.reporterId === user.id && (r.status === 'OPEN' || r.status === 'UNDER_REVIEW'))) {
        throw new ConflictError('You already have an open report for this trip.');
      }
      const report = mutate((data) => {
        const base = submitReport(newId('rpt'), user.id, trip.id, req.body.category, str(req.body.description, 1000));
        // Disputing a no-show/fare puts the related unpaid ledger item under review (§5.5 step 4).
        let linkedLedgerEntryId: string | null = null;
        if (user.id === trip.customerId && (base.category === 'INCORRECT_NO_SHOW' || base.category === 'FARE_DISPUTE')) {
          const entry = data.ledger.find((e) => e.tripId === trip.id && e.ownerId === user.id && e.status === 'UNPAID');
          if (entry) {
            entry.disputeStatus = 'UNDER_REVIEW';
            entry.linkedReportId = base.id;
            linkedLedgerEntryId = entry.id;
          }
        }
        const r = {
          id: base.id,
          tripId: base.tripId,
          reporterId: base.reporterUid,
          category: base.category,
          description: base.details,
          status: 'OPEN' as const,
          reporterRole: user.role,
          reportedUserId: user.id === trip.customerId ? trip.driverId : trip.customerId,
          linkedLedgerEntryId,
          resolutionNote: null,
          resolvedBy: null,
          resolvedAt: null,
          createdAt: nowIso(),
        };
        data.reports.push(r);
        for (const admin of data.users.filter((u) => u.role === 'ADMIN')) {
          notify(data, admin.id, 'REPORT', 'New report', `${r.category.replace(/_/g, ' ').toLowerCase()} on trip ${trip.id.slice(-6)}`, '/admin/reports');
        }
        return r;
      });
      const { reportedUserId: _r, ...publicReport } = report;
      return sendSuccess(res, publicReport, report.linkedLedgerEntryId ? 'Report submitted. The disputed amount is on hold while we review it.' : 'Report submitted. We will review it.', 201);
    }),
  );
  return router;
}

/** Dev-only utilities. */
export function devRouter(): Router {
  const router = Router();
  router.post('/reset', handle((_req, res) => {
    if (process.env.NODE_ENV === 'production') throw new ForbiddenError();
    resetDatabase();
    return sendSuccess(res, { ok: true }, 'Demo data reset.');
  }));
  return router;
}
