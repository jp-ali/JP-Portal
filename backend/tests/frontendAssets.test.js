import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { app } from '../src/app.js';
let server, base;
const built = existsSync(new URL('../../dist/index.html', import.meta.url));
before(async () => { server = app.listen(0); await new Promise(resolve => server.once('listening', resolve)); base = `http://127.0.0.1:${server.address().port}`; });
after(async () => { await new Promise(resolve => server.close(resolve)); });
test('owner navigation and HEAD always use an uncached entry page', { skip: !built }, async () => {
  for (const method of ['GET', 'HEAD']) {
    const response = await fetch(`${base}/owner`, { method });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(response.headers.get('content-type'), /text\/html/);
  }
});
test('a missing old JavaScript bundle returns 404 rather than the HTML portal page', { skip: !built }, async () => {
  const response = await fetch(`${base}/assets/OwnerPortal-previous-release.js`);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(await response.text(), '');
});
test('existing versioned JavaScript assets may be cached immutably', { skip: !built }, async () => {
  const html = await fetch(`${base}/owner`).then(response => response.text());
  const script = /src="(\/assets\/index-[^"]+\.js)"/.exec(html)?.[1];
  assert.ok(script);
  const response = await fetch(`${base}${script}`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /javascript/);
  assert.match(response.headers.get('cache-control'), /immutable/);
});
