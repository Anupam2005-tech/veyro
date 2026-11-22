import express from 'express';
import cors from 'cors';
import { loadConfig } from './config/env.js';
import { getFirebaseAdminApp } from './config/firebase-admin.js';
import { sendSuccess } from './shared/http/response.js';
import { RouteNotFoundError } from './shared/http/app-error.js';
import { errorHandler } from './middleware/error-handler.js';
import { createDocsRouter } from './middleware/api-docs.js';
import { requestContext } from './middleware/request-context.js';

export function createApp(config = loadConfig()): express.Application {
  getFirebaseAdminApp();
  const app = express();

  app.use(requestContext);
  app.use(cors({
    // A list makes cors match the request origin before granting browser access.
    origin: [config.frontendOrigin],
    credentials: true,
    exposedHeaders: ['X-Request-Id'],
  }));

  app.use(express.json());

  // Health check endpoint
  app.get(`${config.apiBasePath}/health`, (_req, res) => {
    res.set('Cache-Control', 'no-store');
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

  if (process.env.ENABLE_API_DOCS === 'true' && process.env.NODE_ENV !== 'production') {
    app.use(`${config.apiBasePath}/docs`, createDocsRouter());
  }

  app.use((_req, _res, next) => next(new RouteNotFoundError()));
  app.use(errorHandler);

  return app;
}
