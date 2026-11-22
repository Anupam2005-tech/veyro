const assert = require('node:assert/strict');
const { once } = require('node:events');
const { test } = require('node:test');
const express = require('express');
const { requestContext } = require('../dist/middleware/request-context.js');
const { sendSuccess, sendError } = require('../dist/shared/http/response.js');

test('response helpers serialize the public contract over HTTP', async t => {
  const app = express();
  app.use(requestContext);
  const pagination = { page: 1, limit: 10, total: 0, totalPages: 0 };
  app.get('/list', (_req, res) => sendSuccess(res, [], 'Retrieved.', 200, {
    ...pagination, requestId: 'override',
  }));
  app.get('/created', (_req, res) => sendSuccess(res, undefined, 'Created.', 201));
  app.get('/empty', (_req, res) => sendSuccess(res, undefined, 'Deleted.', 204));
  app.get('/invalid', (_req, res) => sendError(res, 'Invalid input.', 'INVALID_INPUT', 422, [
    { field: 'email', message: 'Invalid address.', value: 'private', stack: 'internal' },
  ]));
  app.get('/failed', (_req, res) => sendError(res, 'Request failed.'));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const meta = { requestId: 'test-response' };
  async function get(path, status) {
    const response = await fetch('http://127.0.0.1:' + server.address().port + path, {
      headers: { 'X-Request-Id': meta.requestId },
    });
    assert.equal(response.status, status);
    assert.equal(response.headers.get('X-Request-Id'), meta.requestId);
    return response;
  }
  assert.deepEqual(await (await get('/list', 200)).json(), {
    success: true, message: 'Retrieved.', data: [], meta: { ...pagination, ...meta },
  });
  assert.deepEqual(await (await get('/created', 201)).json(), {
    success: true, message: 'Created.', data: null, meta,
  });
  assert.equal(await (await get('/empty', 204)).text(), '');
  assert.deepEqual(await (await get('/invalid', 422)).json(), {
    success: false, message: 'Invalid input.', meta,
    error: { code: 'INVALID_INPUT', details: [{ field: 'email', message: 'Invalid address.' }] },
  });
  assert.deepEqual(await (await get('/failed', 500)).json(), {
    success: false, message: 'Request failed.', meta, error: { code: 'INTERNAL_ERROR', details: [] },
  });
});
