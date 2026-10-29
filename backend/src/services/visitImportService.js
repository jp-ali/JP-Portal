import { createHash } from "node:crypto";
import { FieldValue, Timestamp } from "../config/portalStore.js";
import { portalStore } from "../config/portalStore.js";

const optionalFields = ["cityName", "areaName", "principalName", "phone", "purpose", "session", "branches", "strength", "visitTime", "notes"];
const invalid = (message) => { const error = new Error(message); error.status = 400; return error; };

export function validateImportedVisit(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) throw invalid("Invalid visit row");
  const date = String(row.date || "").trim();
  const schoolName = String(row.schoolName || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T12:00:00+05:00`)) || new Date(`${date}T12:00:00+05:00`).toISOString().slice(0, 10) !== date) throw invalid("Every visit needs a valid date (YYYY-MM-DD)");
  if (!schoolName || schoolName.length > 200) throw invalid("Every visit needs a school name under 200 characters");
  const result = { date, schoolName };
  for (const field of optionalFields) {
    if (row[field] !== undefined && typeof row[field] !== "string") throw invalid(`Invalid ${field}`);
    const value = String(row[field] || "").trim();
    if (value.length > (field === "notes" ? 2000 : 200)) throw invalid(`${field} is too long`);
    result[field] = value;
  }
  return result;
}

export function importVisitId(marketerId, row) {
  const identity = [marketerId, row.date, row.schoolName, row.cityName, row.areaName, row.principalName, row.phone, row.visitTime, row.purpose]
    .map((value) => String(value || "").trim().toLowerCase());
  return `imp_${createHash("sha256").update(JSON.stringify(identity)).digest("hex")}`;
}

export async function importVisitsForMarketer(marketerId, rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 100) throw invalid("Import 1 to 100 visits at a time");
  const normalized = rows.map(validateImportedVisit);
  const db = portalStore();
  const marketerSnap = await db.collection("marketers").doc(marketerId).get();
  if (!marketerSnap.exists) {
    const error = new Error("Marketer not found");
    error.status = 404;
    throw error;
  }
  const marketer = marketerSnap.data();
  const byId = new Map(normalized.map((row) => [importVisitId(marketerId, row), row]));
  const entries = [...byId].map(([id, row]) => ({ ref: db.collection("visits").doc(id), row }));
  const existing = await db.getAll(...entries.map(({ ref }) => ref));
  const batch = db.batch();
  let created = 0;
  entries.forEach(({ ref, row }, index) => {
    if (existing[index].exists) return;
    const createdAt = Timestamp.fromDate(new Date(`${row.date}T12:00:00+05:00`));
    batch.create(ref, {
      ...row,
      visitTime: row.visitTime,
      schoolNames: [row.schoolName],
      schoolIds: [],
      cityId: "",
      areaId: "",
      image: "",
      marketerId,
      marketerEmail: marketer.email,
      marketerName: marketer.name || "",
      createdAt,
      importedAt: FieldValue.serverTimestamp(),
      importSource: "admin"
    });
    created += 1;
  });
  if (created) await batch.commit();
  return { created, skipped: rows.length - created };
}
