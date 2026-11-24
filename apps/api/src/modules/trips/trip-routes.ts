import { Router } from 'express';
import { getFirebaseAdminApp, getFirestore } from '../../config/firebase-admin.js';
import { AppError } from '../../shared/http/app-error.js';
import { sendSuccess } from '../../shared/http/response.js';
import { TripService, publicTrip } from './trip-service.js';
import { documentId } from '../quotes/quote-repository.js';
import { requireRole } from '../../middleware/require-role.js';
import { tripContact } from './trip-contact.js';

export function createTripRouter(): Router {
  const router = Router();
  const db = () => getFirestore(getFirebaseAdminApp());
  const service = () => new TripService(db());
  router.use('/:id', (req, _res, next) => {
    try { documentId(req.params.id!); next(); }
    catch { next(new AppError(400, 'INVALID_IDENTIFIER', 'Invalid trip identifier.')); }
  });
  router.get('/:id', async (req, res, next) => {
    try {
      const trip = await db().collection('trips').doc(req.params.id!).get();
      if (![trip.get('customerId'), trip.get('driverId')].includes(req.auth!.uid)) {
        throw new AppError(404, 'TRIP_NOT_ACCESSIBLE', 'Trip unavailable.');
      }
      sendSuccess(res, publicTrip(trip));
    } catch (error) { next(error); }
  });
  router.route('/:id/contact')
    .get(async (req, res, next) => {
      res.set('Cache-Control', 'private, no-store');
      try { sendSuccess(res, await tripContact(db(), req.params.id!, req.auth!.uid)); }
      catch (error) { next(error); }
    })
    .post(async (req, res, next) => {
      res.set('Cache-Control', 'private, no-store');
      try { sendSuccess(res, await tripContact(db(), req.params.id!, req.auth!.uid, req.body ?? {})); }
      catch (error) { next(error); }
    });
  router.post('/:id/initialize', async (req, res, next) => {
    try { await service().initialize(req.params.id!, req.auth!.uid); sendSuccess(res, { initialized: true }); }
    catch (error) { next(error); }
  });
  router.post('/:id/arrival', async (req, res, next) => {
    try { await service().arrive(req.params.id!, req.auth!.uid); sendSuccess(res, { arrived: true }); }
    catch (error) { next(error); }
  });
  router.post('/:id/arrival/confirm', async (req, res, next) => {
    try { await service().arrive(req.params.id!, req.auth!.uid, true); sendSuccess(res, { arrived: true }); }
    catch (error) { next(error); }
  });
  router.post('/:id/verification-code', requireRole('CUSTOMER'), async (req, res, next) => {
    res.set('Cache-Control', 'private, no-store');
    try {
      const phase: unknown = req.body?.phase;
      if (phase !== 'START' && phase !== 'END') throw new AppError(400, 'INVALID_OTP_PHASE', 'Select the start or end verification code.');
      const issued = await service().issueCode(req.params.id!, req.auth!.uid, phase);
      sendSuccess(res, { ...issued, serverTime: Date.now() });
    } catch (error) { next(error); }
  });
  for (const [path, phase] of [['start', 'START'], ['complete', 'END']] as const) {
    router.post('/:id/' + path, async (req, res, next) => {
      try {
        if (typeof req.body?.code !== 'string') throw new AppError(400, 'OTP_REQUIRED', 'A verification code is required.');
        await service().verifyCode(req.params.id!, req.auth!.uid, phase, req.body.code);
        sendSuccess(res, { verified: true });
      } catch (error) { next(error); }
    });
  }
  router.post('/:id/customer-no-show', async (req, res, next) => {
    try { await service().customerNoShow(req.params.id!, req.auth!.uid); sendSuccess(res, { recorded: true }); }
    catch (error) { next(error); }
  });
  router.post('/:id/driver-no-show', requireRole('CUSTOMER'), async (req, res, next) => {
    try {
      const description: unknown = req.body?.description;
      if (typeof description !== 'string' || !description.trim() || description.length > 2000) {
        throw new AppError(400, 'INVALID_REPORT', 'Describe what happened at the pickup point.');
      }
      const id = await service().reportDriverNoShow(req.params.id!, req.auth!.uid, description.trim());
      sendSuccess(res, { id }, 'Driver no-show sent for review.');
    }
    catch (error) { next(error); }
  });
  return router;
}
