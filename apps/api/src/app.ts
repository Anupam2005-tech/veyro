import express from 'express';
import cors from 'cors';
import { loadConfig } from './config/env.js';
import { getFirebaseAdminApp } from './config/firebase-admin.js';
import { sendSuccess } from './shared/http/response.js';
import { RouteNotFoundError } from './shared/http/app-error.js';
import { errorHandler } from './middleware/error-handler.js';

export function createApp(config = loadConfig()): express.Application {
  getFirebaseAdminApp();
  const app = express();

  app.use(cors({
    origin: config.frontendOrigin,
    credentials: true,
  }));

  // Attach request tracing id
  app.use((req, res, next) => {
    const incomingId = req.headers['x-request-id'];
    const requestId = typeof incomingId === 'string' && incomingId.length > 0
      ? incomingId
      : `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    (req as { id?: string }).id = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  });

  app.use(express.json());

  // Health check endpoint
  app.get(`${config.apiBasePath}/health`, (_req, res) => {
    return sendSuccess(
      res,
      {
        status: 'UP',
        service: 'veyro-api',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      },
      'Veyro API is healthy and operational'
    );
  });

  app.use((_req, _res, next) => next(new RouteNotFoundError()));
  app.use(errorHandler);

  return app;
}
