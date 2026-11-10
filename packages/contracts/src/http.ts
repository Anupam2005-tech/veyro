/**
 * Canonical Veyro API HTTP Response Envelope Types
 * Reference: docs/veyro_backend.md §6.2–6.4 and docs/veyro.md §10
 */

export interface ApiMeta {
  requestId: string;
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface ApiFieldError {
  field?: string;
  message: string;
  value?: unknown;
}

export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta: ApiMeta;
}

export interface ApiErrorPayload {
  code: string;
  details?: ApiFieldError[];
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error: ApiErrorPayload;
  meta: ApiMeta;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

