import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import bcrypt from 'bcryptjs';
import { app } from '../src/app.js';
import { postgresPool, closePostgresPool } from '../src/config/postgres.js';
import { portalStore } from '../src/config/portalStore.js';
import { withCompany } from '../src/services/companyContext.js';
import { publicCompany, companyById } from '../src/services/companyService.js';
import { DEFAULT_FEATURES } from '../../shared/company.js';
import { createJwtSession } from '../src/services/jwtSession.js';

const unique = randomUUID().slice(0, 8);
const ownerId = `test-owner-${unique}`;
const ownerEmail = `${ownerId}@example.test`;
let server, base, ownerCookie, first, second, firstCookie, secondCookie;
const ownedIds = [];
const headers = (cookie, slug) => ({ 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...(slug ? { 'x-company-slug': slug } : {}) });
const call = (path, options = {}) => fetch(`${base}/api${path}`, options);
const customHostStatus = hostHeaders => new Promise((resolve, reject) => {
  const request = http.get(`${base}/api/company`, { headers: hostHeaders }, response => { response.resume(); resolve(response.statusCode); });
  request.on('error', reject);
});
before(async () => {
  process.env.SESSION_SECRET = 'white-label-suite-secret-at-least-32-characters';
  await postgresPool().query('INSERT INTO portal_owners(id,email,name,password_hash) VALUES($1,$2,$3,$4)', [ownerId, ownerEmail, 'Test Owner', await bcrypt.hash('owner-test-password-123', 4)]);
  server = app.listen(0); await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  for (const id of ownedIds) {
    await postgresPool().query('DELETE FROM portal_documents WHERE company_id=$1', [id]);
    await postgresPool().query('DELETE FROM portal_company_domains WHERE company_id=$1', [id]);
    await postgresPool().query('DELETE FROM portal_sessions WHERE company_id=$1', [id]);
    await postgresPool().query('DELETE FROM portal_owner_audit WHERE company_id=$1', [id]);
    await postgresPool().query('DELETE FROM portal_companies WHERE id=$1', [id]);
  }
  await postgresPool().query('DELETE FROM portal_sessions WHERE account_id=$1', [ownerId]);
  await postgresPool().query('DELETE FROM portal_owners WHERE id=$1', [ownerId]);
  await portalStore().doc(`system_meta/white-label-preservation-${unique}`).delete();
  await closePostgresPool();
});
test('owner login is separate from company admins; no public company management', async () => {
  assert.equal((await call('/owner/companies')).status, 401);
  const admin = await createJwtSession({ sub: 'admin', role: 'admin' });
  assert.equal((await call('/owner/companies', { headers: headers(`school_visit_owner_session=${admin}`) })).status, 401);
  const result = await call('/owner/login', { method: 'POST', headers: headers(), body: JSON.stringify({ email: ownerEmail, password: 'owner-test-password-123' }) });
  assert.equal(result.status, 200); ownerCookie = result.headers.get('set-cookie').split(';')[0];
  assert.match(result.headers.get('set-cookie'), /HttpOnly/);
  assert.match(result.headers.get('set-cookie'), /Path=\/api\/owner/);
});
test('create companies with different branding and independent admins using the same email', async () => {
  await portalStore().doc(`system_meta/white-label-preservation-${unique}`).set({ preserved: unique });
  for (const [index, name] of ['Fixture Alpha', 'Fixture Beta'].entries()) {
    const result = await call('/owner/companies', { method: 'POST', headers: headers(ownerCookie), body: JSON.stringify({ name, slug: `fixture-${unique}-${index}`, adminName: `${name} Admin`, adminEmail: 'same-admin@example.test', adminPassword: `company-${index}-password-123`, books: [name + ' Series'], primaryColor: '#123456' }) });
    assert.equal(result.status, 201, await result.clone().text());
    const company = (await result.json()).company; ownedIds.push(company.id);
    assert.equal(company.admin_password_hash, undefined);
    if (index === 0) first = company; else second = company;
    const branding = await call('/company', { headers: headers(null, company.slug) });
    assert.equal((await branding.json()).company.name, name);
    const login = await call('/auth/login', { method: 'POST', headers: headers(null, company.slug), body: JSON.stringify({ identifier: 'same-admin@example.test', password: `company-${index}-password-123` }) });
    assert.equal(login.status, 200); if (index === 0) firstCookie = login.headers.get('set-cookie').split(';')[0]; else secondCookie = login.headers.get('set-cookie').split(';')[0];
  }
  assert.equal((await portalStore().doc(`system_meta/white-label-preservation-${unique}`).get()).data().preserved, unique);
  const wrong = await call('/auth/login', { method: 'POST', headers: headers(null, second.slug), body: JSON.stringify({ identifier: 'same-admin@example.test', password: 'company-0-password-123' }) });
  assert.equal(wrong.status, 401);
});
test('sessions cannot be reused in another company even with identical admin IDs', async () => {
  assert.equal((await call('/auth/me', { headers: headers(firstCookie, first.slug) })).status, 200);
  assert.equal((await call('/auth/me', { headers: headers(firstCookie, second.slug) })).status, 401);
  assert.equal((await call('/auth/me', { headers: headers(secondCookie, first.slug) })).status, 401);
});
test('direct report links resolve company queries and dedicated domains cannot override companies', async () => {
  assert.equal((await call(`/auth/me?company=${first.slug}`, { headers: headers(firstCookie) })).status, 200);
  assert.equal((await call(`/auth/me?company=${second.slug}`, { headers: headers(firstCookie) })).status, 401);
  const domain = `fixture-${unique}.example.test`;
  assert.equal((await call(`/owner/companies/${first.id}`, { method: 'PATCH', headers: headers(ownerCookie), body: JSON.stringify({ domains: [domain] }) })).status, 200);
  assert.equal(await customHostStatus({ host: domain }), 200);
  assert.equal(await customHostStatus({ ...headers(null, second.slug), host: domain }), 403);
});
test('company admins can edit books without granting features or changing owner settings', async () => {
  const allowed = await call('/company', { method: 'PUT', headers: headers(firstCookie, first.slug), body: JSON.stringify({ books: ['Alpha New Series'] }) });
  assert.equal(allowed.status, 200); assert.deepEqual((await allowed.json()).company.books, ['Alpha New Series']);
  for (const body of [{ features: DEFAULT_FEATURES }, { active: false }, { adminPassword: 'new-password-123' }]) assert.equal((await call('/company', { method: 'PUT', headers: headers(firstCookie, first.slug), body: JSON.stringify(body) })).status, 403);
});
test('disabling My Card does not prevent company admins from creating a marketer', async () => {
  assert.equal((await call(`/owner/companies/${first.id}`, { method: 'PATCH', headers: headers(ownerCookie), body: JSON.stringify({ features: { cards: false } }) })).status, 200);
  const account = { name: 'No Card Marketer', email: `no-card-${unique}@example.test`, phone: '03001234567', password: 'marketer-password-123' };
  const response = await call('/marketers', { method: 'POST', headers: headers(firstCookie, first.slug), body: JSON.stringify(account) });
  assert.equal(response.status, 201, await response.clone().text());
  assert.equal((await call('/cards', { headers: headers(firstCookie, first.slug) })).status, 403);
});
test('document reads, queries, counts, batches and transactions isolate identical paths concurrently', async () => {
  const store = portalStore();
  await Promise.all([first, second].map(company => withCompany(company, async () => {
    const batch = store.batch(); batch.set(store.doc('cities/shared-id'), { name: company.name }); batch.set(store.doc('areas/shared-area'), { name: company.name, cityId: 'shared-id' }); await batch.commit();
    await store.runTransaction(async transaction => { const ref = store.doc('cities/shared-id'); const old = await transaction.get(ref); assert.equal(old.data().name, company.name); transaction.update(ref, { touched: company.slug }); });
    assert.equal((await store.doc('cities/shared-id').get()).data().touched, company.slug);
    assert.equal((await store.collection('cities').get()).docs[0].data().name, company.name);
    assert.equal((await store.collection('cities').count().get()).data().count, 1);
    assert.equal((await store.getAll(store.doc('cities/shared-id')))[0].data().name, company.name);
  })));
  for (const [company, cookie] of [[first, firstCookie], [second, secondCookie]]) {
    const response = await call('/data/query', { method: 'POST', headers: headers(cookie, company.slug), body: JSON.stringify({ collectionPath: 'cities', filters: [] }) });
    assert.equal(response.status, 200); const rows = (await response.json()).docs;
    assert.equal(rows.length, 1); assert.equal(rows[0].data.name, company.name);
  }
  await withCompany(first, () => store.doc('cities/shared-id').delete());
  assert.equal((await withCompany(second, () => store.doc('cities/shared-id').get())).exists, true);
});
test('disabled features block direct APIs, generic data access, batches and stored writes', async () => {
  const response = await call(`/owner/companies/${first.id}`, { method: 'PATCH', headers: headers(ownerCookie), body: JSON.stringify({ features: { attendance: false, visits: false, trainer: false, monthlyAttendance: false, offlineVisits: false } }) });
  assert.equal(response.status, 200);
  for (const path of ['/data/attendance/monthly?month=2026-11', '/visits/summary', '/trainers']) assert.equal((await call(path, { headers: headers(firstCookie, first.slug) })).status, 403);
  for (const collectionPath of ['attendance', 'visits']) assert.equal((await call('/data/query', { method: 'POST', headers: headers(firstCookie, first.slug), body: JSON.stringify({ collectionPath }) })).status, 403);
  assert.equal((await call('/data/query', { method: 'POST', headers: headers(firstCookie, first.slug), body: JSON.stringify({ collectionPath: 'trainer_visits' }) })).status, 400);
  assert.equal((await call('/data/batch', { method: 'POST', headers: headers(firstCookie, first.slug), body: JSON.stringify({ operations: [{ operation: 'set', path: 'visits/forbidden', data: { name: 'test' } }] }) })).status, 403);
  const refreshed = publicCompany(await companyById(first.id));
  await assert.rejects(withCompany(refreshed, () => portalStore().doc('attendance/forbidden').set({ test: true })), /disabled/);
});
test('inactive companies and changed admin credentials revoke old sessions without affecting another company', async () => {
  const result = await call(`/owner/companies/${first.id}`, { method: 'PATCH', headers: headers(ownerCookie), body: JSON.stringify({ adminPassword: 'changed-company-password-123' }) }); assert.equal(result.status, 200);
  assert.equal((await call('/auth/me', { headers: headers(firstCookie, first.slug) })).status, 401);
  assert.equal((await call('/auth/me', { headers: headers(secondCookie, second.slug) })).status, 200);
  const inactive = await call(`/owner/companies/${second.id}`, { method: 'PATCH', headers: headers(ownerCookie), body: JSON.stringify({ active: false }) }); assert.equal(inactive.status, 200);
  assert.equal((await call('/company', { headers: headers(null, second.slug) })).status, 403);
  assert.equal((await call('/auth/me', { headers: headers(secondCookie, second.slug) })).status, 403);
});
test('unknown tenants, invalid feature types, unsupported image formats and duplicate slugs fail closed', async () => {
  assert.equal((await call('/company', { headers: headers(null, 'missing-company') })).status, 404);
  for (const change of [{ features: { visits: 'false' } }, { logo: 'data:image/svg+xml;base64,AAAA' }, { domains: ['https://example.com'] }]) assert.equal((await call(`/owner/companies/${first.id}`, { method: 'PATCH', headers: headers(ownerCookie), body: JSON.stringify(change) })).status, 400);
  const duplicate = await call('/owner/companies', { method: 'POST', headers: headers(ownerCookie), body: JSON.stringify({ name: 'Duplicate', slug: first.slug, adminEmail: 'duplicate@example.test', adminPassword: 'duplicate-password-123' }) }); assert.equal(duplicate.status, 409);
});
