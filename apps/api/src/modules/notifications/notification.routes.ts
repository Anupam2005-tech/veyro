import { Router } from 'express';
import { postFcmToken, postTestDelivery } from './notification.controller.js';

export function notificationRouter(): Router {
  const router = Router();
  // TODO(BE-001): authenticate before controllers.
  router.post('/tokens', postFcmToken);
  router.post('/delivery-check', postTestDelivery);
  return router;
}
