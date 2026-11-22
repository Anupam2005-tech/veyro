import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

const requestIdPattern = /^[A-Za-z0-9._-]{1,128}$/;

export const requestContext: RequestHandler = (req, res, next) => {
  const incoming = req.get('X-Request-Id');
  req.id = incoming && requestIdPattern.test(incoming) ? incoming : `req_${randomUUID()}`;
  res.setHeader('X-Request-Id', req.id);
  next();
};
