import express from 'express';
import cors from 'cors';
import { sendSuccess } from './shared/http/response.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { vehicleRouter } from './modules/customers/vehicle.routes.js';
import { driverRouter } from './modules/drivers/driver.routes.js';
import { bookingRouter, placesRouter } from './modules/bookings/booking.routes.js';
import { tripRouter } from './modules/trips/trip.routes.js';
import { paymentRouter } from './modules/payments/payment.routes.js';
import { adminFileRouter, adminRouter } from './modules/admin/admin.routes.js';
import { devRouter, notificationRouter, reportRouter, shareRouter } from './modules/misc.routes.js';
import { env } from './config/env.js';

export function createApp(): express.Application {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  const origins = env.frontendOrigin.split(',').map((o) => o.trim()).filter(Boolean);
  app.use(cors({ origin: origins.length > 1 ? origins : origins[0], credentials: true }));

  // Razorpay webhook must see the raw body for signature verification (§5.8).
  app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
  // Document uploads arrive as base64 JSON (≤5 MB file ≈ 6.7 MB encoded).
  app.use('/api/v1/drivers/documents', express.json({ limit: '8mb' }));
  app.use(express.json({ limit: '200kb' }));

  // Attach request tracing id
  app.use((req, res, next) => {
    const incomingId = req.headers['x-request-id'];
    const requestId = typeof incomingId === 'string' && incomingId.length > 0 && incomingId.length < 100
      ? incomingId
      : `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    (req as { id?: string }).id = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  });

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

  app.use('/api/v1', authRouter());
  app.use('/api/v1/customers/vehicles', vehicleRouter());
  app.use('/api/v1/drivers', driverRouter());
  app.use('/api/v1/places', placesRouter());
  app.use('/api/v1/bookings', bookingRouter());
  app.use('/api/v1/trips', tripRouter());
  app.use('/api/v1/payments', paymentRouter());
  app.use('/api/v1/share', shareRouter());
  app.use('/api/v1/notifications', notificationRouter());
  app.use('/api/v1/reports', reportRouter());
  app.use('/api/v1/admin-files', adminFileRouter());
  app.use('/api/v1/admin', adminRouter());
  app.use('/api/v1/dev', devRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
