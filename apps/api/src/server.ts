import dotenv from 'dotenv';
dotenv.config({ path: ['.env.local', '.env'] });

import { createApp } from './app.js';
import { validateEnv } from './config/env.js';
import { db, flush } from './store/db.js';
import { startBackgroundJobs } from './services/simulator.js';

validateEnv();
const port = Number(process.env.PORT) || 4000;
const app = createApp();
db();
startBackgroundJobs();

const server = app.listen(port, () => {
  console.log(`[Veyro API] Server listening on http://localhost:${port}`);
  console.log(`[Veyro API] Health check at http://localhost:${port}/api/v1/health`);
});

function shutdown(): void {
  flush();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
