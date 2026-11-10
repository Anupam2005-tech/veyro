import type { Response } from 'express';
import type { ApiSuccessResponse, ApiErrorResponse, ApiMeta, ApiFieldError } from '@veyro/contracts';

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Operation successful',
  statusCode = 200,
  metaExtra?: Record<string, unknown>
): Response {
  const requestId = (res.req as { id?: string }).id ?? 'req_local_dev';
  const meta: ApiMeta = {
    requestId,
    ...metaExtra,
  };

  const payload: ApiSuccessResponse<T> = {
    success: true,
    message,
    data,
    meta,
  };

  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  message: string,
  errorCode = 'INTERNAL_ERROR',
  statusCode = 500,
  details: ApiFieldError[] = [],
  metaExtra?: Record<string, unknown>
): Response {
  const requestId = (res.req as { id?: string }).id ?? 'req_local_dev';
  const meta: ApiMeta = {
    requestId,
    ...metaExtra,
  };

  const payload: ApiErrorResponse = {
    success: false,
    message,
    error: {
      code: errorCode,
      details,
    },
    meta,
  };

  return res.status(statusCode).json(payload);
}

