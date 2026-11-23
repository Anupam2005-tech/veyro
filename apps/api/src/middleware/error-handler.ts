import type { NextFunction, Request, Response } from 'express';
import type { ApiFieldError } from '@veyro/contracts';
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
    const details = (err as AppError & { details?: ApiFieldError[] }).details ?? [];
    return sendError(res, err.message, err.code, err.statusCode, details);
  }
  if (err && typeof err === 'object' && (err as { type?: string }).type === 'entity.too.large') {
    return sendError(res, 'Upload is too large.', 'PAYLOAD_TOO_LARGE', 413);
  }
  if (err && typeof err === 'object' && (err as { type?: string }).type === 'entity.parse.failed') {
    return sendError(res, 'Request body is not valid JSON.', 'VALIDATION_ERROR', 400);
  }
  console.error('[Veyro API] Unexpected error', err instanceof Error ? err.message : err);
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
