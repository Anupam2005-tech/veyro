import { onRequest } from 'firebase-functions/v2/https';
import { createApp } from '@veyro/api/app';

const app = createApp();

/**
 * 2nd-gen HTTPS onRequest function hosting the Express modular monolith.
 * Canonical prefix: /api/v1/
 */
export const api = onRequest(
  {
    region: 'asia-east2', // Hong Kong (nearest supported Cloud Functions region for Mumbai resources)
    memory: '512MiB',
    timeoutSeconds: 60,
  },
  app
);

