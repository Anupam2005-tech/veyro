import { Router } from 'express';
import { resolve } from 'node:path';

export function createDocsRouter(): Router {
  const router = Router();
  const spec = resolve(__dirname, '../../docs/openapi.yaml');

  router.get('/openapi.yaml', (_req, res) => res.type('application/yaml').sendFile(spec));
  for (const asset of ['swagger-ui.css', 'swagger-ui-bundle.js']) {
    const file = require.resolve('swagger-ui-dist/' + asset);
    router.get('/' + asset, (_req, res) => res.sendFile(file));
  }
  router.get('/', (req, res) => {
    // Relative asset URLs also work under a Functions emulator project prefix.
    if (!req.originalUrl.split('?')[0]?.endsWith('/')) return res.redirect('docs/');
    res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Veyro API</title>
<link rel="stylesheet" href="swagger-ui.css"></head><body>
<div id="swagger-ui"></div><script src="swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({url:"openapi.yaml",dom_id:"#swagger-ui",validatorUrl:null});</script>
</body></html>`);
  });
  return router;
}
