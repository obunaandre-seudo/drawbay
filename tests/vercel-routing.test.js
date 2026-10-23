import assert from 'node:assert/strict';
import test from 'node:test';
import { getExpressApiUrl } from '../api/routing.js';
import handler from '../api/index.js';
import { getProductionConfigProblems } from '../api/production-config.js';

test('routes account registration to the Express registration endpoint', () => {
  assert.equal(
    getExpressApiUrl({ __drawbay_path: 'auth/register' }),
    '/api/auth/register'
  );
});

test('preserves API query parameters and removes the internal rewrite parameter', () => {
  assert.equal(
    getExpressApiUrl({ __drawbay_path: 'projects', category: 'houses', page: ['1', '2'] }),
    '/api/projects?category=houses&page=1&page=2'
  );
});

test('rejects a request without a rewritten API path', () => {
  assert.equal(getExpressApiUrl({}), null);
});

test('reports missing production configuration instead of crashing the function', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const response = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };

  try {
    await handler({ query: {} }, response);
    assert.equal(response.statusCode, 503);
    assert.match(response.body.error, /DATABASE_URL/);
    assert.match(response.body.error, /JWT_SECRET/);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});

test('checks production credentials used to start the API', () => {
  assert.deepEqual(getProductionConfigProblems({ NODE_ENV: 'development' }), []);
  assert.deepEqual(getProductionConfigProblems({ NODE_ENV: 'production' }), [
    'DATABASE_URL', 'JWT_SECRET'
  ]);
});
