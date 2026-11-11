import { companyStorage } from './companyBranding.js';
const keyFor = (user) => `jp-admin-portal-mode:${String(user?.email || "").trim().toLowerCase()}`;

export function readTrainerPortalPreference(user) {
  if (user?.role !== "admin") return false;
  try { return companyStorage.getItem(keyFor(user)) === "trainer"; }
  catch { return false; }
}

export function saveTrainerPortalPreference(user, trainerMode) {
  if (user?.role !== "admin") return;
  try { companyStorage.setItem(keyFor(user), trainerMode ? "trainer" : "marketer"); }
  catch { /* Browser storage can be unavailable. Keep the current session working. */ }
}
