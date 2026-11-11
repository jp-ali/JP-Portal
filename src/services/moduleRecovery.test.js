import test from 'node:test';
import assert from 'node:assert/strict';
import { freshPortalUrl, isModuleLoadError, recoverModuleLoad } from './moduleRecovery.js';
const message = new TypeError('Failed to fetch dynamically imported module: https://portal.test/assets/OwnerPortal-old.js');
function fixture() {
  const values = new Map();
  const replaced = [];
  return { location: { href: 'https://portal.test/owner?existing=1', pathname: '/owner', replace: url => replaced.push(url) }, navigator: { onLine: true }, storage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }, now: 100000,
    fetch: async () => new Response('<div id="root"></div>', { headers: { 'content-type': 'text/html' } }), replaced };
}
test('stale module recovery keeps the portal address and existing query parameters', async () => {
  const env = fixture();
  assert.equal(isModuleLoadError(message), true);
  assert.equal(await recoverModuleLoad(message, env), true);
  assert.equal(env.replaced[0], 'https://portal.test/owner?existing=1&_portal_reload=100000');
  assert.equal(await recoverModuleLoad(message, env), false);
  assert.equal(env.replaced.length, 1);
});
test('offline, unavailable server, and unrelated errors never create reload loops', async () => {
  const offline = fixture(); offline.navigator.onLine = false;
  assert.equal(await recoverModuleLoad(message, offline), false);
  const unavailable = fixture(); unavailable.fetch = async () => new Response('Bad gateway', { status: 502 });
  assert.equal(await recoverModuleLoad(message, unavailable), false);
  const brokenNetwork = fixture(); brokenNetwork.fetch = async () => { throw new TypeError('Failed to fetch'); };
  assert.equal(await recoverModuleLoad(message, brokenNetwork), false);
  assert.equal(await recoverModuleLoad(new Error('Invalid password'), fixture()), false);
});
test('manual recovery replaces only the cache-busting parameter', () => {
  assert.equal(freshPortalUrl({ href: 'https://portal.test/company/afaq/?_portal_reload=1&news=42' }, 2), 'https://portal.test/company/afaq/?_portal_reload=2&news=42');
});
