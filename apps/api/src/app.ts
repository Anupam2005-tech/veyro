import express from 'express';
import cors from 'cors';
import { loadConfig } from './config/env.js';
import { getFirebaseAdminApp } from './config/firebase-admin.js';
import { sendSuccess } from './shared/http/response.js';
import { RouteNotFoundError } from './shared/http/app-error.js';
import { errorHandler } from './middleware/error-handler.js';
import { createDocsRouter } from './middleware/api-docs.js';
import { requestContext } from './middleware/request-context.js';

import { authenticate } from './middleware/authenticate.js';
import { requireAppCheck } from './middleware/require-app-check.js';
import { bootstrapSession } from './modules/auth/session.js';

import { createPaymentRouter, razorpayWebhook } from './modules/payments/payment-routes.js';
import { createSafetyRouter } from './modules/safety/safety-routes.js';
import { requireRole } from './middleware/require-role.js';

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

  app.post(`${config.apiBasePath}/payments/webhooks/razorpay`,
    express.raw({ type: 'application/json', limit: '256kb' }), razorpayWebhook);
  app.use(express.json());

  app.post(`${config.apiBasePath}/auth/session`, authenticate, requireAppCheck, bootstrapSession);

  app.use(`${config.apiBasePath}/payments`, authenticate, requireAppCheck, requireRole('CUSTOMER'), createPaymentRouter());
  const safety = createSafetyRouter();
  for (const path of ['/reports', '/admin/reports', '/admin/audit', '/sos', '/notifications']) {
    app.use(`${config.apiBasePath}${path}`, authenticate, requireAppCheck, requireRole('CUSTOMER', 'DRIVER', 'ADMIN'));
  }
  app.use(config.apiBasePath, safety);

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
