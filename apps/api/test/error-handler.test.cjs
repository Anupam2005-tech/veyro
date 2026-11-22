const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');
const express = require('express');
const { createApp } = require('../dist/app.js');
const { AppError } = require('../dist/shared/http/app-error.js');
const { errorHandler } = require('../dist/middleware/error-handler.js');

async function serve(t, app) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return 'http://127.0.0.1:' + server.address().port;
}

test('API parser and missing routes return safe errors with request context', async t => {
  const base = await serve(t, createApp());
  for (const [body, status, code] of [
    [undefined, 404, 'ROUTE_NOT_FOUND'],
    ['private-value', 400, 'INVALID_JSON'],
    ['x'.repeat(110000), 413, 'PAYLOAD_TOO_LARGE'],
  ]) {
    const response = await fetch(base + '/missing?token=private-value', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-request-id': 'req_test' }, body,
    });
    const json = await response.json();
    assert.equal(response.status, status);
    assert.equal(json.success, false);
    assert.equal(json.error.code, code);
    assert.equal(json.meta.requestId, response.headers.get('x-request-id'));
    assert.equal(json.meta.requestId, 'req_test');
    assert.doesNotMatch(JSON.stringify(json), /private-value/);
  }
});

test('handler preserves public errors and hides unexpected exception contents', async t => {
  const app = express();
  const details = [{ field: 'pickup', message: 'Required.' }];
  app.get('/known', () => { throw new AppError(422, 'INVALID_PICKUP', 'Invalid pickup.', details); });
  app.get('/unknown', () => { throw new Error('private-value'); });
  app.use(errorHandler);
  const base = await serve(t, app);
  const known = await fetch(base + '/known');
  assert.equal(known.status, 422);
  assert.deepEqual((await known.json()).error, { code: 'INVALID_PICKUP', details });
  const log = t.mock.method(console, 'error', () => {});
  const unknown = await fetch(base + '/unknown');
  assert.equal(unknown.status, 500);
  const json = await unknown.json();
  assert.equal(json.error.code, 'INTERNAL_ERROR');
  assert.doesNotMatch(JSON.stringify(json), /private-value|stack/);
  assert.equal(log.mock.callCount(), 1);
  assert.doesNotMatch(JSON.stringify(log.mock.calls[0].arguments), /private-value/);
});

test('delegates failures after response headers were sent', () => {
  const error = new Error('late failure');
  let forwarded;
  errorHandler(error, {}, { headersSent: true }, err => { forwarded = err; });
  assert.equal(forwarded, error);
});
