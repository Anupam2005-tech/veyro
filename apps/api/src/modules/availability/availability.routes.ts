import { Router } from 'express';
import { patchAvailability } from './availability.controller.js';
import { availabilityStatusValidators } from './availability.validator.js';

export function availabilityRouter(): Router {
  const router = Router();
  // TODO(BE-001): authenticate, requireRole(DRIVER), AppCheck before controller.
  router.patch('/', ...availabilityStatusValidators(), patchAvailability);
  return router;
}
