const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');
const { createApp } = require('../dist/app.js');
const { parseConfig } = require('../dist/config/env.js');

test('CORS grants browser access only to the configured frontend origin', async t => {
  const frontend = 'https://app.example';
  const config = parseConfig({ NODE_ENV: 'production', FRONTEND_ORIGIN: frontend });
  const server = createApp(config).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = 'http://127.0.0.1:' + server.address().port + '/api/v1/health';

  for (const origin of [frontend, 'https://app.example.invalid', 'https://app.example:8443',
    'http://app.example', 'http://localhost:3000', 'null', undefined]) {
    for (const method of ['GET', 'OPTIONS']) {
      const headers = origin ? { Origin: origin } : {};
      if (method === 'OPTIONS') {
        headers['Access-Control-Request-Method'] = 'GET';
        headers['Access-Control-Request-Headers'] = 'Authorization,X-Firebase-AppCheck,X-Request-Id';
      }
      const response = await fetch(url, { method, headers });
      assert.equal(response.status, method === 'OPTIONS' ? 204 : 200);
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin === frontend ? frontend : null);
      assert.match(response.headers.get('Vary'), /\bOrigin\b/i);
      if (origin === frontend) {
        assert.equal(response.headers.get('Access-Control-Allow-Credentials'), 'true');
        assert.match(response.headers.get('Access-Control-Expose-Headers'), /X-Request-Id/i);
        if (method === 'OPTIONS') {
          assert.match(response.headers.get('Access-Control-Allow-Methods'), /\bGET\b/);
          assert.equal(response.headers.get('Access-Control-Allow-Headers'), headers['Access-Control-Request-Headers']);
        }
      }
      await response.arrayBuffer();
    }
  }
});
