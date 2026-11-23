import { Router } from 'express';
import { getFirebaseAdminApp, getFirestore } from '../../config/firebase-admin.js';
import { AppError } from '../../shared/http/app-error.js';
import { sendSuccess } from '../../shared/http/response.js';
import { TripService, publicTrip } from './trip-service.js';
import { documentId } from '../quotes/quote-repository.js';

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
  router.post('/:id/driver-no-show', async (req, res, next) => {
    try { await service().driverNoShow(req.params.id!, req.auth!.uid); sendSuccess(res, { recorded: true }); }
    catch (error) { next(error); }
  });
  return router;
}
