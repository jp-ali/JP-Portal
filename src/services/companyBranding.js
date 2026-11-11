import { DEFAULT_COMPANY, DEFAULT_FEATURES } from '../../shared/company.js';

export function companySlugFromPath(path = globalThis.location?.pathname || '/') {
  return /^\/company\/([a-z][a-z0-9-]{1,47})(?:\/|$)/.exec(path)?.[1] || '';
}
const storageIdentity = () => companySlugFromPath() || globalThis.location?.hostname || 'javed';
let company = DEFAULT_COMPANY;
export const getCompany = () => company;
export const companyName = () => company.name;
export const companyInitials = () => company.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
export const featureEnabled = feature => company.features?.[feature] !== false;
export function assertExportsAllowed() {
  if (!featureEnabled('exports')) throw new Error('Report downloads are disabled for your company.');
}
export function allowedCompanyItem(item) {
  const text = String(item.label || item.title || item.key || '').toLowerCase();
  if (/monthly/.test(text)) return featureEnabled('attendance') && featureEnabled('monthlyAttendance');
  if (/attendance/.test(text)) return featureEnabled('attendance');
  if (/weekly|all weeks/.test(text)) return featureEnabled('weeklyPlans');
  if (/daily|action.plan/.test(text)) return featureEnabled('dailyPlans');
  if (/expense/.test(text)) return featureEnabled('expenses');
  if (/visit|media/.test(text)) return featureEnabled('visits');
  if (/trainer/.test(text)) return featureEnabled('trainer');
  if (/card/.test(text)) return featureEnabled('cards');
  if (/news/.test(text)) return featureEnabled('news');
  if (/catalogue/.test(text)) return featureEnabled('catalogues');
  return true;
}
export function tenantStorageKey(key) {
  return company.id === 'javed' ? key : `company:${company.id}:${key}`;
}
export const companyStorage = {
  getItem: key => globalThis.localStorage?.getItem(tenantStorageKey(key)) ?? null,
  setItem: (key, value) => globalThis.localStorage?.setItem(tenantStorageKey(key), value),
  removeItem: key => globalThis.localStorage?.removeItem(tenantStorageKey(key))
};
export function setCompanyBranding(value) {
  company = { ...value, features: { ...DEFAULT_FEATURES, ...value.features } };
  if (globalThis.document) {
    document.title = `${company.name} | School Visit Portal`;
    document.documentElement.style.setProperty('--company-primary', company.primaryColor);
    document.documentElement.dataset.company = company.id;
    document.documentElement.dataset.noExports = String(!featureEnabled('exports'));
    const manifest = document.querySelector('link[rel="manifest"]');
    if (manifest && company.id !== 'javed') manifest.href = `/api/company/manifest?company=${encodeURIComponent(company.slug)}`;
    const theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.content = company.primaryColor;
    if (company.id !== 'javed' && !company.logo) {
      let icon = document.querySelector('link[rel="icon"]');
      if (!icon) { icon = document.createElement('link'); icon.rel = 'icon'; document.head.append(icon); }
      icon.href = `/api/company/icon?company=${encodeURIComponent(company.slug)}`;
    }
  }
}

export function installCompanyDownloadControls() {
  if (featureEnabled('exports') || !globalThis.document) return;
  const isReport = element => /\b(pdf|excel|csv|xlsx|corel|cdr)\b/i.test(`${element.textContent || ''} ${element.getAttribute('title') || ''} ${element.getAttribute('aria-label') || ''}`);
  const update = () => document.querySelectorAll('button,a[download]').forEach(element => {
    if (isReport(element)) { element.hidden = true; element.classList.add('company-export-hidden'); }
  });
  const observer = new MutationObserver(update);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  update();
  document.addEventListener('click', event => {
    const element = event.target.closest('button,a');
    if (element && isReport(element)) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
}
export async function initializeCompany() {
  const key = `portal-branding:${storageIdentity()}`;
  const cachedCompany = () => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } };
  if (globalThis.navigator?.onLine === false) {
    const cached = cachedCompany();
    if (cached) { setCompanyBranding(cached); return; }
    if (!companySlugFromPath() || companySlugFromPath() === 'javed') { setCompanyBranding(DEFAULT_COMPANY); return; }
    throw new Error('Open this company portal online once before using it offline.');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/company`, { credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      headers: companySlugFromPath() ? { 'x-company-slug': companySlugFromPath() } : {} });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.company) throw Object.assign(new Error(result.error || `Company service unavailable (${response.status}). Please retry.`), { status: response.status });
    setCompanyBranding(result.company);
    try { localStorage.setItem(key, JSON.stringify(result.company)); } catch { /* Browsing can continue without caching branding. */ }
  } catch (error) {
    // A network outage must still allow the previously configured company to
    // open its offline visit workspace. Explicit inactive/unknown responses fail closed.
    if (!error.status || error.status >= 500) {
      const cached = cachedCompany();
      if (cached) { setCompanyBranding(cached); return; }
      if (companySlugFromPath() === 'javed' || (!companySlugFromPath() && ['visit.javedpublishers.com', 'localhost', '127.0.0.1', '10.20.10.60'].includes(globalThis.location?.hostname))) { setCompanyBranding(DEFAULT_COMPANY); return; }
    }
    throw error;
  } finally { clearTimeout(timer); }
}
