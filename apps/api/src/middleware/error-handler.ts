import type { ErrorRequestHandler } from 'express';
import { AppError } from '../shared/http/app-error.js';
import { sendError } from '../shared/http/response.js';

function classifyError(error: unknown): AppError | undefined {
  if (error instanceof AppError) return error;
  if (!(error instanceof Error) || !('type' in error)) return;

  switch (error.type) {
    case 'entity.parse.failed':
      return new AppError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
    case 'entity.too.large':
      return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');
    case 'charset.unsupported':
    case 'encoding.unsupported':
      return new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Unsupported request body encoding.');
    case 'request.aborted':
    case 'request.size.invalid':
      return new AppError(400, 'INVALID_REQUEST_BODY', 'Incomplete request body.');
  }
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) return next(error);

  const known = classifyError(error);
  if (known) {
    return sendError(res, known.message, known.code, known.statusCode, known.details);
  }

  console.error('Unexpected API error');
  return sendError(res, 'The request could not be completed.');
};
