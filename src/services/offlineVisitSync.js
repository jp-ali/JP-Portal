import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from "./dataGateway.js";
import { db } from "./dataGateway.js";
import { makeAreaId, makeCityId, makeSchoolId, normalizeEntityName } from "../domain/catalog.js";
import { listOfflineVisits, removeOfflineVisit } from "./offlineVisitStore.js";

export async function syncOfflineVisits(user) {
  if (user?.role !== "marketer" || !navigator.onLine) return { synced: 0, pending: 0 };
  const email = String(user.email || "").trim().toLowerCase();
  const drafts = (await listOfflineVisits()).filter((item) => String(item.ownerEmail || "").trim().toLowerCase() === email);
  let synced = 0;
  for (const draft of drafts) {
    const capturedAt = new Date(draft.capturedAt || draft.savedAt);
    if (Number.isNaN(capturedAt.getTime())) continue;
    const cityId = draft.cityId || makeCityId(draft.cityName);
    const areaId = draft.areaId || makeAreaId(cityId, draft.areaName);
    const schoolId = draft.schoolId || makeSchoolId(areaId, draft.schoolName);
    if (!draft.schoolId && (user.assignedCityIds || []).includes(cityId) && (user.assignedAreaIds || []).includes(areaId)) {
      const schoolRef = doc(db, "schools", schoolId);
      if (!(await getDoc(schoolRef)).exists()) await setDoc(schoolRef, {
          name: draft.schoolName, normalizedName: normalizeEntityName(draft.schoolName),
          cityId, city: draft.cityName, cityName: draft.cityName,
          areaId, area: draft.areaName, areaName: draft.areaName,
          source: "manual-marketer", addedByMarketerEmail: user.email,
          createdAt: serverTimestamp()
        });
    }
    const payload = {
      cityId, cityName: draft.cityName,
      areaId, areaName: draft.areaName,
      schoolIds: [schoolId],
      schoolNames: [draft.schoolName], schoolName: draft.schoolName,
      principalName: draft.principalName || "", phone: draft.phone || "",
      purpose: draft.purpose || "", session: draft.session || "",
      branches: draft.branches || "", strength: draft.strength || "",
      visitTime: capturedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }),
      notes: draft.notes || "", image: draft.image,
      marketerEmail: user.email, marketerId: user.marketerId || "",
      createdAt: Timestamp.fromDate(capturedAt), syncedAt: serverTimestamp(), offlineVisit: true
    };
    await setDoc(doc(db, "visits", draft.id), payload);
    await removeOfflineVisit(draft.id);
    synced += 1;
  }
  return { synced, pending: drafts.length - synced };
}
