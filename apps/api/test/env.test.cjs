const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { parseConfig } = require('../dist/config/env.js');

test('local defaults and explicit runtime settings', () => {
  assert.deepEqual(parseConfig({}), {
    port: 4000, apiBasePath: '/api/v1', frontendOrigin: 'http://localhost:3000',
  });
  assert.deepEqual(parseConfig({
    NODE_ENV: 'production', PORT: '8080', FRONTEND_ORIGIN: 'https://app.example:443/',
  }), { port: 8080, apiBasePath: '/api/v1', frontendOrigin: 'https://app.example' });
});

test('rejects invalid settings with only the setting name in the error', () => {
  const cases = {
    NODE_ENV: ['prod'], PORT: ['', '0', '-1', '1.1', '0x50', '65536'],
    API_BASE_PATH: ['/v2'], FRONTEND_ORIGIN: [
      '*', 'https://*.example', 'https://user:password@example.com',
      'https://app.example/path', 'https://app.example?secret', 'https://host:99999',
    ],
  };
  for (const [key, values] of Object.entries(cases)) {
    for (const value of values) {
      assert.throws(() => parseConfig({ [key]: value }), { message: 'Invalid API configuration: ' + key });
    }
  }
});

test('production startup exits before listening with missing or insecure origin', () => {
  for (const frontendOrigin of [undefined, 'http://app.example']) {
    const env = { NODE_ENV: 'production' };
    if (frontendOrigin) env.FRONTEND_ORIGIN = frontendOrigin;
    const result = spawnSync(process.execPath, [require.resolve('../dist/server.js')], {
      env, encoding: 'utf8', timeout: 3000,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Invalid API configuration: FRONTEND_ORIGIN/);
    assert.doesNotMatch(result.stdout, /listening/);
  }
});
