import { Router } from 'express';
import { getFirebaseAdminApp, getFirestore } from '../../config/firebase-admin.js';
import { AppError } from '../../shared/http/app-error.js';
import { sendSuccess } from '../../shared/http/response.js';
import { requireRole } from '../../middleware/require-role.js';
import { identifier } from '../profiles/profile-service.js';
import { googleRoadProvider } from './geo.js';
import { MobilityService } from './mobility-service.js';

export function createMobilityRouter(): Router {
  const router = Router();
  const db = () => getFirestore(getFirebaseAdminApp());
  const service = () => new MobilityService(db(), googleRoadProvider());
  router.get('/availability', requireRole('DRIVER'), async (req, res, next) => {
    try {
      const record = await db().collection('driverAvailability').doc(req.auth!.uid).get();
      const updatedAt = record.get('updatedAt');
      const fresh = Number.isSafeInteger(updatedAt) && Date.now() >= updatedAt && Date.now() - updatedAt <= 30000;
      sendSuccess(res, { online: record.get('online') === true && fresh, stale: !fresh, updatedAt: updatedAt ?? null });
    } catch (e) { next(e); }
  });
  router.post('/availability', requireRole('DRIVER'), async (req, res, next) => {
    try {
      if (typeof req.body?.online !== 'boolean') throw new AppError(400, 'INVALID_INPUT', 'Specify online status.');
      if (req.body.renew !== undefined && (req.body.renew !== true || !req.body.online)) {
        throw new AppError(400, 'INVALID_INPUT', 'Only an online shift can be renewed.');
      }
      await service().availability(req.auth!.uid, req.body.online, req.body.position, req.body.renew === true);
      sendSuccess(res, { online: req.body.online });
    } catch (e) { next(e); }
  });
  router.post('/mobility/routes', requireRole('CUSTOMER'), async (req, res, next) => {
    try {
      if (!Array.isArray(req.body?.points)) throw new AppError(400, 'INVALID_ROUTE', 'Route points required.');
      sendSuccess(res, await service().route(req.auth!.uid, identifier(req.body.vehicleId), req.body.points,
        req.body.radiusKm ?? 15, req.body.expanded === true, req.body.pickupAt ?? null));
    } catch (e) { next(e); }
  });
  router.post('/mobility/eligibility', requireRole('CUSTOMER'), async (req, res, next) => {
    try { sendSuccess(res, await service().eligibility(req.auth!.uid, identifier(req.body?.driverId), identifier(req.body?.routeId))); }
    catch (e) { next(e); }
  });
  router.post('/locations/:id', requireRole('DRIVER'), async (req, res, next) => {
    try { await service().location(req.auth!.uid, identifier(req.params.id), req.body ?? {}); sendSuccess(res, { recorded: true }); }
    catch (e) { next(e); }
  });
  router.get('/locations/:id', async (req, res, next) => {
    try {
      const id = identifier(req.params.id);
      const result = await db().runTransaction(async tx => {
        const trip = await tx.get(db().collection('trips').doc(id));
        if (![trip.get('customerId'), trip.get('driverId')].includes(req.auth!.uid) ||
            !['DRIVER_EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'].includes(trip.get('status'))) {
          throw new AppError(404, 'TRIP_NOT_ACCESSIBLE', 'Active assigned trip required.');
        }
        const location = await tx.get(db().collection('liveLocations').doc(id));
        const fresh = location.exists && Date.now() - location.get('observedAt') <= 30000;
        return { stale: !fresh, position: fresh ? { lat: location.get('lat'), lng: location.get('lng') } : null,
          observedAt: location.get('observedAt') ?? null };
      });
      res.set('Cache-Control', 'no-store');
      sendSuccess(res, result);
    } catch (e) { next(e); }
  });
  router.post('/shares', requireRole('CUSTOMER'), async (req, res, next) => {
    try { res.set('Cache-Control', 'no-store'); sendSuccess(res, await service().createShare(req.auth!.uid, identifier(req.body?.tripId))); }
    catch (e) { next(e); }
  });
  router.get('/shares/view', async (req, res, next) => {
    try {
      const token = req.get('X-Trip-Share');
      if (!token) throw new AppError(404, 'SHARE_UNAVAILABLE', 'Share unavailable.');
      res.set('Cache-Control', 'no-store');
      sendSuccess(res, await service().readShare(token));
    } catch (e) { next(e); }
  });
  router.post('/shares/:id/revoke', requireRole('CUSTOMER'), async (req, res, next) => {
    try { await service().revokeShare(req.auth!.uid, identifier(req.params.id)); sendSuccess(res, { revoked: true }); }
    catch (e) { next(e); }
  });
  return router;
}
