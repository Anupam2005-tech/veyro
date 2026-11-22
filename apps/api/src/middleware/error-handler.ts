import type { NextFunction, Request, Response } from 'express';
import { sendError } from '../shared/http/response.js';
import { AppError } from '../shared/errors/errors.js';

/** Final error handler — safe messages only, no stacks/secrets to clients. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): Response {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.code, err.statusCode);
  }
  console.error('[Veyro API] Unexpected error');
  return sendError(res, 'Something went wrong.', 'INTERNAL_ERROR', 500);
}

export function notFoundHandler(req: Request, res: Response): Response {
  return sendError(
    res,
    `Cannot ${req.method} ${req.originalUrl}`,
    'ROUTE_NOT_FOUND',
    404,
  );
}
