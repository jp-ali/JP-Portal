import { companyStorage } from './companyBranding.js';
const keyFor = (email, accountId) => `jp-trainer-offline-catalog:${String(email || "").trim().toLowerCase()}:${String(accountId || "")}`;
const empty = () => ({ cities: [], schools: [] });

export function readTrainerOfflineCatalog(email, accountId) {
  try {
    const value = JSON.parse(companyStorage.getItem(keyFor(email, accountId)) || "null");
    return value && Array.isArray(value.cities) && Array.isArray(value.schools) ? value : empty();
  } catch { return empty(); }
}

export function cacheTrainerOfflineCatalog(email, accountId, rows = {}) {
  if (!email || !accountId) return;
  const previous = readTrainerOfflineCatalog(email, accountId);
  const merge = (before, after) => [...new Map([...(before || []), ...(after || [])].filter((row) => row?.id).map((row) => [row.id, row])).values()];
  try {
    companyStorage.setItem(keyFor(email, accountId), JSON.stringify({ cities: merge(previous.cities, rows.cities), schools: merge(previous.schools, rows.schools) }));
  } catch { /* Offline storage may be unavailable. */ }
}
