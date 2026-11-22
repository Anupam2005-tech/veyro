const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const { body, query } = require('express-validator');
const { createApp } = require('../dist/app.js');
const { validateRequest } = require('../dist/middleware/validate-request.js');
const { errorHandler } = require('../dist/middleware/error-handler.js');
const { requestContext } = require('../dist/middleware/request-context.js');

async function serve(t, app) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return 'http://127.0.0.1:' + server.address().port;
}

test('public liveness response contains only service status and tracing metadata', async t => {
  const base = await serve(t, createApp());
  const res = await fetch(base + '/api/v1/health');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const payload = await res.json();
  const timestamp = new Date(payload.data.timestamp).toISOString();
  assert.ok(res.headers.get('x-request-id'));
  assert.deepEqual(payload, {
    success: true, message: 'Veyro API is healthy and operational',
    data: { status: 'UP', service: 'veyro-api', version: '1.0.0', timestamp },
    meta: { requestId: res.headers.get('x-request-id') },
  });
});

test('validation chains report all safe field errors and only valid input reaches the controller', async t => {
  const app = express();
  app.use(requestContext, express.json());
  let handled = 0;
  app.post('/sample', body('name').trim().isLength({ min: 3 }).withMessage('Name is too short.'),
    query('page').isInt().withMessage('Page must be an integer.'), validateRequest, (req, res) => {
      handled += 1;
      res.json({ name: req.body.name });
    });
  app.use(errorHandler);
  const base = await serve(t, app);
  const post = (page, name) => fetch(base + '/sample?page=' + page, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }),
  });
  const invalid = await post('private-value', 'x');
  assert.equal(invalid.status, 400);
  const payload = await invalid.json();
  assert.deepEqual(payload.error, { code: 'VALIDATION_ERROR', details: [
    { field: 'name', message: 'Name is too short.' },
    { field: 'page', message: 'Page must be an integer.' },
  ] });
  assert.equal(payload.meta.requestId, invalid.headers.get('x-request-id'));
  assert.equal(handled, 0);
  const valid = await post('1', ' Alice ');
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), { name: 'Alice' });
  assert.equal(handled, 1);
});
