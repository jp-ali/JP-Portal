import { request } from "./authApi.js";
import { listOfflineVisits, removeOfflineVisit } from "./offlineVisitStore.js";
import { canUseOfflineMode } from "../domain/offlineModes.js";

export async function syncTrainerOfflineVisits(user) {
  if (!user || !canUseOfflineMode(user, "trainer") || !navigator.onLine) return { synced: 0, pending: 0 };
  const email = String(user.email || "").trim().toLowerCase();
  const accountId = user.trainerId || user.marketerId || "";
  const drafts = (await listOfflineVisits()).filter((draft) => draft.mode === "trainer" && draft.ownerEmail === email && draft.ownerAccountId === accountId);
  let synced = 0;
  for (const draft of drafts) {
    await request("/trainers/offline-visits", { method: "POST", body: JSON.stringify({ ...draft, offlineId: draft.id }), timeoutMs: 45000 });
    await removeOfflineVisit(draft.id);
    synced += 1;
  }
  return { synced, pending: drafts.length - synced };
}
