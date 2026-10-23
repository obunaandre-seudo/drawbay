import assert from 'node:assert/strict';
import test from 'node:test';
import { getExpressApiUrl } from '../api/routing.js';

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
