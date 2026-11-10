import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';

const port = Number(process.env.PORT) || 4000;
const app = createApp();

app.listen(port, () => {
  console.log(`[Veyro API] Server listening on http://localhost:${port}`);
  console.log(`[Veyro API] Health check at http://localhost:${port}/api/v1/health`);
});

