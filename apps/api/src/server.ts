import { loadConfig } from './config/env.js';
import { createApp } from './app.js';

const config = loadConfig();
const { port } = config;
const app = createApp(config);

app.listen(port, () => {
  console.log(`[Veyro API] Server listening on http://localhost:${port}`);
  console.log(`[Veyro API] Health check at http://localhost:${port}/api/v1/health`);
});

