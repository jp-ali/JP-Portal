import { FieldValue } from "firebase-admin/firestore";
import { firestore } from "../config/firebase.js";

export function dateInPakistan(value) {
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const part = (name) => parts.find((item) => item.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function summarizeVisitDates(rows, today = dateInPakistan(new Date())) {
  const month = today.slice(0, 7);
  let todayVisits = 0;
  let monthlyVisits = 0;
  for (const row of rows) {
    const date = dateInPakistan(row.createdAt);
    if (date === today) todayVisits += 1;
    if (date.startsWith(month)) monthlyVisits += 1;
  }
  return { visits: rows.length, todayVisits, monthlyVisits };
}

export async function marketerVisitSummary(request, response, next) {
  if (request.user?.role !== "marketer") return response.status(403).json({ error: "Marketer access required" });
  try {
    const email = request.user.email;
    const [visits, samples] = await Promise.all([
      firestore().collection("visits").where("marketerEmail", "==", email).select("createdAt").get(),
      firestore().collection("samples").where("marketerEmail", "==", email).count().get()
    ]);
    const summary = summarizeVisitDates(visits.docs.map((item) => item.data()));
    summary.samples = samples.data().count;
    response.set("Cache-Control", "no-store");
    response.json({ summary });
  } catch (error) { next(error); }
}

export function canEditVisit(user, visit, now = new Date()) {
  if (user?.role === "admin") return true;
  if (user?.role !== "marketer") return false;
  const ownsVisit = visit.marketerId
    ? visit.marketerId === user.marketerId
    : String(visit.marketerEmail || "").toLowerCase() === String(user.email || "").toLowerCase();
  return ownsVisit && dateInPakistan(visit.createdAt) === dateInPakistan(now);
}

const editableFields = ["schoolName", "principalName", "phone", "purpose", "session", "branches", "strength", "notes"];

export async function updateVisit(request, response, next) {
  try {
    const id = request.params.id;
    if (!id || id.includes("/")) return response.status(400).json({ error: "Invalid visit ID" });
    const data = {};
    for (const field of editableFields) {
      if (typeof request.body?.[field] !== "string") {
        return response.status(400).json({ error: `${field} must be text` });
      }
      data[field] = request.body[field].trim();
      if (data[field].length > (field === "notes" ? 2000 : 200)) {
        return response.status(400).json({ error: `${field} is too long` });
      }
    }
    if (!data.schoolName || !data.principalName || !data.phone || !data.purpose || !data.session) {
      return response.status(400).json({ error: "School, contact, phone, purpose and session are required" });
    }
    if (data.strength && (!/^\d+$/.test(data.strength) || Number(data.strength) < 1)) {
      return response.status(400).json({ error: "Strength must be a positive number" });
    }
    if (data.branches && (!/^\d+$/.test(data.branches) || Number(data.branches) < 1)) {
      return response.status(400).json({ error: "Branches must be a positive number" });
    }
    const ref = firestore().collection("visits").doc(id);
    const result = await firestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return "missing";
      if (!canEditVisit(request.user, snapshot.data())) return "forbidden";
      transaction.update(ref, {
        ...data,
        schoolNames: [data.schoolName],
        editedAt: FieldValue.serverTimestamp(),
        editedBy: request.user.role === "admin" ? "admin" : request.user.marketerId
      });
      return "updated";
    });
    if (result === "missing") return response.status(404).json({ error: "Visit not found" });
    if (result === "forbidden") return response.status(403).json({ error: "Marketers can edit only their own visits on the visit date" });
    return response.json({ updated: true });
  } catch (error) {
    next(error);
  }
}
