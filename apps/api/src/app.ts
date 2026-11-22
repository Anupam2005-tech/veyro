import express from 'express';
import cors from 'cors';
import { sendSuccess, sendError } from './shared/http/response.js';
import { availabilityRouter } from './modules/availability/availability.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { tripLocationRouter } from './modules/trips/location.routes.js';
import { shareLinkRouter } from './modules/share-links/share-link.routes.js';
import { notificationRouter } from './modules/notifications/notification.routes.js';

export function createApp(): express.Application {
  const app = express();

  app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
    credentials: true,
  }));

  app.use(express.json());

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

  // Health check endpoint
  app.get('/api/v1/health', (_req, res) => {
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

  // Team 3 — Maps/realtime/supporting backend (auth wiring pending BE-001).
  app.use('/api/v1/drivers/availability', availabilityRouter());
  app.use('/api/v1/trips/:tripId/location', tripLocationRouter());
  app.use('/api/v1', shareLinkRouter());
  app.use('/api/v1/notifications', notificationRouter());
  app.use('/api/v1/admin', adminRouter());

  // 404 Not Found handler
  app.use((req, res) => {
    return sendError(
      res,
      `Cannot ${req.method} ${req.originalUrl}`,
      'ROUTE_NOT_FOUND',
      404
    );
  });

  return app;
}

