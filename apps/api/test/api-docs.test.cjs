const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');
const { createApp } = require('../dist/app.js');

test('Swagger UI, its assets and contract require an explicit non-production opt-in', async t => {
  const config = { port: 4000, apiBasePath: '/api/v1', frontendOrigin: 'http://localhost:3000' };
  for (const [mode, flag, enabled] of [
    ['development', 'false', false], ['production', 'true', false], ['development', 'true', true],
  ]) {
    process.env.NODE_ENV = mode;
    process.env.ENABLE_API_DOCS = flag;
    const server = createApp(config).listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => new Promise(resolve => server.close(resolve)));
    const base = 'http://127.0.0.1:' + server.address().port + '/api/v1/docs';
    for (const [suffix, content] of [
      ['', /SwaggerUIBundle/], ['/openapi.yaml', /operationId: getHealth/],
      ['/swagger-ui-bundle.js', /SwaggerUIBundle/], ['/swagger-ui.css', /swagger-ui/],
    ]) {
      const response = await fetch(base + suffix);
      assert.equal(response.status, enabled ? 200 : 404);
      if (enabled) assert.match(await response.text(), content);
      else assert.equal((await response.json()).error.code, 'ROUTE_NOT_FOUND');
    }
  }
});
