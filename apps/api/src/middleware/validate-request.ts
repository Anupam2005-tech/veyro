import type { RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import { AppError } from '../shared/http/app-error.js';

/** Place after route validation chains and before the controller. */
export const validateRequest: RequestHandler = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map(error => {
    // Chain messages are public, developer-authored strings. Never copy input values.
    const message = typeof error.msg === 'string' ? error.msg : 'Invalid input.';
    return error.type === 'field' ? { field: error.path, message } : { message };
  });
  next(new AppError(400, 'VALIDATION_ERROR', 'Request validation failed.', details));
};
