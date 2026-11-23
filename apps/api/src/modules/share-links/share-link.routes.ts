import { Router } from 'express';
import {
  deleteShareLink,
  getShareByToken,
  postShareLink,
} from './share-link.controller.js';

export function shareLinkRouter(): Router {
  const router = Router();
  // TODO(BE-001/BE-016): authenticate + ownership + persistence before controllers.
  router.post('/trips/:tripId/share-links', postShareLink);
  router.get('/share/:token', getShareByToken);
  router.delete('/trips/:tripId/share-links/:shareId', deleteShareLink);
  return router;
}
