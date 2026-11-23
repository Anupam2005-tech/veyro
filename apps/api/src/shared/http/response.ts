import type { Response } from 'express';
import type { ApiSuccessResponse, ApiErrorResponse, ApiMeta, ApiFieldError } from '@veyro/contracts';

function responseMeta(res: Response, extra?: Record<string, unknown>): ApiMeta {
  return { ...extra, requestId: res.req.id ?? 'req_local_dev' };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Operation successful',
  statusCode = 200,
  metaExtra?: Record<string, unknown>
): Response {
  if (statusCode === 204) return res.status(204).end();

  const payload: ApiSuccessResponse<T | null> = {
    success: true,
    message,
    data: data ?? null,
    meta: responseMeta(res, metaExtra),
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
  const payload: ApiErrorResponse = {
    success: false,
    message,
    error: {
      code: errorCode,
      details: details.map(({ field, message }) => ({ field, message })),
    },
    meta: responseMeta(res, metaExtra),
  };

  return res.status(statusCode).json(payload);
}

