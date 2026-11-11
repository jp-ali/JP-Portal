export const isModuleLoadError = error => /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|loading chunk|unable to preload css/i.test(String(error?.message || error || ''));

export function freshPortalUrl(location = globalThis.location, now = Date.now()) {
  const url = new URL(location.href);
  url.searchParams.set('_portal_reload', String(now));
  return url.href;
}

export async function recoverModuleLoad(error, environment = {}) {
  if (!isModuleLoadError(error)) return false;
  const location = environment.location || globalThis.location;
  const navigator = environment.navigator || globalThis.navigator;
  const fetchPage = environment.fetch || globalThis.fetch;
  const now = environment.now ?? Date.now();
  if (!location || navigator?.onLine === false || !fetchPage) return false;
  const key = `portal-module-recovery:${location.pathname}`;
  let storage;
  try {
    storage = environment.storage || globalThis.sessionStorage;
    if (!storage || now - Number(storage.getItem(key) || 0) < 60000) return false;
  } catch { return false; }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    // Check the network first. Reloading into another outage would erase a
    // useful error page without repairing a cached module URL.
    const response = await fetchPage(freshPortalUrl(location, now), { cache: 'no-store', credentials: 'same-origin', signal: controller.signal });
    if (!response.ok || !(response.headers.get('content-type') || '').includes('text/html')) return false;
    if (!(await response.text()).includes('id="root"')) return false;
    storage.setItem(key, String(now));
    location.replace(freshPortalUrl(location, now));
    return true;
  } catch { return false; }
  finally { clearTimeout(timer); }
}
