import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { validationResult } from 'express-validator';
import { AppError, ValidationError } from '../errors/errors.js';

/** Wraps sync/async handlers so thrown AppErrors reach the error middleware. */
export function handle(fn: (req: Request, res: Response) => unknown): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = fn(req, res);
      if (out instanceof Promise) out.catch(next);
    } catch (err) {
      next(err);
    }
  };
}

/** Rejects with the canonical envelope when express-validator found problems. */
export function checkValidation(req: Request, _res: Response, next: NextFunction): void {
  const result = validationResult(req);
  if (result.isEmpty()) {
    next();
    return;
  }
  const err = new ValidationError('Please check the highlighted fields.');
  (err as AppError & { details?: unknown }).details = result.array().map((e) => ({
    field: 'path' in e ? String(e.path) : undefined,
    message: String(e.msg),
  }));
  next(err);
}

export function str(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function param(req: Request, name: string): string {
  const v = req.params[name];
  return typeof v === 'string' ? v : '';
}

/** Tiny in-memory rate limiter (per key, sliding window). */
const buckets = new Map<string, number[]>();
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  return true;
}
