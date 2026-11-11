import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_COMPANY, DEFAULT_FEATURES } from '../../shared/company.js';
import { allowedCompanyItem, assertExportsAllowed, companyName, companySlugFromPath, companyStorage, setCompanyBranding, tenantStorageKey } from './companyBranding.js';
afterEach(() => { setCompanyBranding(DEFAULT_COMPANY); delete globalThis.localStorage; });
test('company addresses distinguish the owner route and explicit company workspaces', () => {
  assert.equal(companySlugFromPath('/company/afaq/'), 'afaq');
  assert.equal(companySlugFromPath('/company/demo-education/visits'), 'demo-education');
  assert.equal(companySlugFromPath('/owner'), '');
  assert.equal(companySlugFromPath('/company/../../owner'), '');
});
test('company caches and offline database keys isolate the same account while preserving Javed keys', () => {
  const records = new Map();
  globalThis.localStorage = { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), removeItem: key => records.delete(key) };
  companyStorage.setItem('profile:same@email.test', 'old-javed');
  assert.equal(tenantStorageKey('jp-portal-offline-visits'), 'jp-portal-offline-visits');
  const alpha = { ...DEFAULT_COMPANY, id: 'alpha', name: 'Alpha', features: DEFAULT_FEATURES };
  setCompanyBranding(alpha); companyStorage.setItem('profile:same@email.test', 'alpha');
  assert.equal(companyStorage.getItem('profile:same@email.test'), 'alpha');
  assert.equal(tenantStorageKey('jp-portal-offline-visits'), 'company:alpha:jp-portal-offline-visits');
  setCompanyBranding({ ...alpha, id: 'beta', name: 'Beta' });
  assert.equal(companyName(), 'Beta'); assert.equal(companyStorage.getItem('profile:same@email.test'), null);
  setCompanyBranding(DEFAULT_COMPANY); assert.equal(companyStorage.getItem('profile:same@email.test'), 'old-javed');
});
test('disabled feature cards disappear and export functions refuse downloads', () => {
  setCompanyBranding({ ...DEFAULT_COMPANY, features: { ...DEFAULT_FEATURES, attendance: false, visits: false, trainer: false, exports: false } });
  for (const label of ['Mark Attendance', 'Monthly Attendance', 'Today\'s Visits', 'Add Trainer']) assert.equal(allowedCompanyItem({ label }), false);
  assert.equal(allowedCompanyItem({ title: 'Support' }), true);
  assert.throws(assertExportsAllowed, /disabled/);
});
