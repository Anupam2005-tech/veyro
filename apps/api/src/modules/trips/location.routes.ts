import { Router } from 'express';
import { postTripLocation } from './location.controller.js';
import { tripLocationValidators } from './location.validator.js';

export function tripLocationRouter(): Router {
  const router = Router({ mergeParams: true });
  // TODO(BE-001/BE-016): authenticate + assignment check before controller.
  router.post('/', ...tripLocationValidators(), postTripLocation);
  return router;
}
