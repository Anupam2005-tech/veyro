import type { AuthFlowError } from '@/lib/auth/types';

export function normalizeAuthError(error: unknown): AuthFlowError {
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    return error as AuthFlowError;
  }

  const result = new Error(
    error instanceof Error ? error.message : 'Something went wrong. Please try again.'
  ) as AuthFlowError;
  result.code = 'auth/unknown';
  return result;
}
