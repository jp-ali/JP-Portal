import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { FieldValue, Timestamp } from "../db/documentValues.js";
import { postgresDocumentStore } from "../db/postgresDocumentStore.js";
import { canSeeSchool } from "../domain/schoolVisibility.js";

export const dataRoutes = Router();
dataRoutes.use(requireAuth);

const publicCollections = new Set(["cities", "areas", "schools", "catalogues", "petrol_rates", "system_meta"]);
const ownedCollections = new Set(["visits", "samples", "attendance", "action_plans"]);
const adminOnlyCollections = new Set(["customReports", "deleted_media"]);
const directApiCollections = new Set(["marketers", "deleted_marketers", "admin_profiles", "savedCards", "cardTemplates", "news", "newsSchedules", "pushSubscriptions", "marketerNewsReads"]);
const operationKey = "__portalDocumentOperation";
const typeKey = "__schoolVisitValueType";
const fieldPattern = /^[A-Za-z][A-Za-z0-9_.]{0,80}$/;

function bad(message, status = 400) { return Object.assign(new Error(message), { status }); }
function rootOf(path) { return String(path || "").split("/")[0]; }
function collectionAllowed(path, user) {
  const root = rootOf(path);
  if (directApiCollections.has(root)) throw bad("Use the dedicated account or news API", 403);
  if (!publicCollections.has(root) && !ownedCollections.has(root) && !adminOnlyCollections.has(root)) throw bad("Unknown data collection", 400);
  if (user.role !== "admin" && adminOnlyCollections.has(root)) throw bad("Admin access required", 403);
  if (root === "catalogues" && path.split("/").length > 3 && !/^catalogues\/[^/]+\/chunks$/.test(path)) throw bad("Invalid catalogue path");
}
function documentAllowed(path, user) {
  const pieces = String(path || "").split("/");
  if (pieces.length < 2 || pieces.length % 2 !== 0 || pieces.some((piece) => !piece || piece.length > 200)) throw bad("Invalid document path");
  collectionAllowed(pieces.slice(0, -1).join("/"), user);
}
function revive(value) {
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === "object") {
    if (value[operationKey] === "timestamp") return FieldValue.serverTimestamp();
    if (value[operationKey] === "delete") return FieldValue.delete();
    if (value[typeKey] === "timestamp") return new Timestamp(value.seconds, value.nanoseconds);
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, revive(child)]));
  }
  return value;
}
function filtersOf(input) {
  if (!Array.isArray(input) || input.length > 4) throw bad("Invalid query filters");
  return input.map((filter) => {
    if (!filter || typeof filter.field !== "string" || !fieldPattern.test(filter.field)
      || !["==", "in", ">=", ">", "<=", "<"].includes(filter.operator)) throw bad("Invalid query filter");
    if (filter.operator === "in" && (!Array.isArray(filter.value) || !filter.value.length || filter.value.length > 30)) throw bad("Invalid query values");
    return { field: filter.field, operator: filter.operator, value: revive(filter.value) };
  });
}
function queryFor(path, filters) {
  let result = postgresDocumentStore().collection(path);
  for (const filter of filters) result = result.where(filter.field, filter.operator, filter.value);
  return result;
}
async function ownedIdentity(user) {
  const ids = [...new Set([user.marketerId, ...(user.subordinateMarketerIds || [])].filter(Boolean))];
  const records = await postgresDocumentStore().getAll(...ids.map((id) => postgresDocumentStore().collection("marketers").doc(id)));
  const emails = [...new Set([user.email, ...records.filter((row) => row.exists).map((row) => row.data().email)].filter(Boolean))];
  return { ids, emails };
}
function ownsDocument(data, identity) {
  return identity.ids.includes(data?.marketerId) || identity.emails.some((email) => String(data?.marketerEmail || "").toLowerCase() === String(email).toLowerCase());
}
async function scopedDocuments(path, filters, user) {
  const query = queryFor(path, filters);
  if (rootOf(path) === "schools") {
    return (await query.get()).docs.filter((snapshot) => canSeeSchool(snapshot.data(), user));
  }
  if (user.role === "admin" || !ownedCollections.has(rootOf(path))) return (await query.get()).docs;
  const identity = await ownedIdentity(user);
  const results = await Promise.all([
    identity.ids.length ? query.where("marketerId", "in", identity.ids).get() : { docs: [] },
    identity.emails.length ? query.where("marketerEmail", "in", identity.emails).get() : { docs: [] }
  ]);
  return [...new Map(results.flatMap((result) => result.docs).map((snapshot) => [snapshot.ref.path, snapshot])).values()]
    .filter((snapshot) => ownsDocument(snapshot.data(), identity));
}
async function assertCanRead(path, payload, user) {
  documentAllowed(path, user);
  if (rootOf(path) === "schools" && payload && !canSeeSchool(payload, user)) throw bad("Record access denied", 403);
  if (user.role === "admin" || !ownedCollections.has(rootOf(path)) || !payload) return;
  if (!ownsDocument(payload, await ownedIdentity(user))) throw bad("Record access denied", 403);
}
async function assertCanWrite(ref, operation, data, user, merge = false) {
  documentAllowed(ref.path, user);
  if (user.role === "admin") return;
  const root = rootOf(ref.path);
  if (root === "catalogues" || root === "petrol_rates" || root === "customReports" || root === "deleted_media") throw bad("Admin access required", 403);
  if (root === "system_meta") throw bad("Admin access required", 403);
  if (["cities", "areas", "schools"].includes(root)) {
    const existing = await ref.get();
    const old = existing.data() || {};
    const assignedCities = user.assignedCityIds || [];
    const assignedAreas = user.assignedAreaIds || [];
    if (root === "cities" && !assignedCities.includes(ref.id)) throw bad("City is not assigned", 403);
    if (root === "areas" && !assignedCities.includes(data?.cityId || old.cityId)) throw bad("City is not assigned", 403);
    if (root === "schools" && !assignedAreas.includes(data?.areaId || old.areaId)) throw bad("Area is not assigned", 403);
    if (root === "schools" && existing.exists && old.source === "manual-marketer"
      && String(old.addedByMarketerEmail || "").trim().toLowerCase() !== String(user.email || "").trim().toLowerCase()) throw bad("School belongs to another marketer", 403);
    if (root === "schools" && !existing.exists && data?.source === "manual-marketer"
      && String(data.addedByMarketerEmail || "").trim().toLowerCase() !== String(user.email || "").trim().toLowerCase()) throw bad("School owner must be your account", 403);
    if (root === "schools" && existing.exists && old.source === "manual-marketer" && data?.addedByMarketerEmail
      && String(data.addedByMarketerEmail).trim().toLowerCase() !== String(user.email || "").trim().toLowerCase()) throw bad("School owner cannot change", 403);
    if (root === "schools" && existing.exists && old.source === "manual-marketer" && data?.source && data.source !== "manual-marketer") throw bad("Private school cannot become shared", 403);
    if (root === "schools" && existing.exists && old.source !== "manual-marketer" && data?.source === "manual-marketer") throw bad("Shared school cannot become private", 403);
    if (root === "schools" && existing.exists && old.source !== "manual-marketer" && operation === "delete") throw bad("Only your own schools can be deleted", 403);
    if (data?.cityId && root === "areas" && data.cityId !== old.cityId && existing.exists) throw bad("Area city cannot change", 403);
    if (data?.areaId && root === "schools" && data.areaId !== old.areaId && existing.exists) throw bad("School area cannot change", 403);
    return;
  }
  if (!ownedCollections.has(root)) throw bad("Record write denied", 403);
  const existing = await ref.get();
  const identity = { ids: [user.marketerId], emails: [user.email] };
  if (existing.exists && !ownsDocument(existing.data(), identity)) throw bad("Record access denied", 403);
  const removingOwnVisitImage = root === "visits" && operation === "update"
    && data && Object.keys(data).length === 1 && data.image === null;
  if (root === "visits" && existing.exists && operation !== "delete" && !removingOwnVisitImage) throw bad("Use the visit edit service", 403);
  if (data && Object.hasOwn(data, "marketerId") && data.marketerId !== user.marketerId) throw bad("Record owner cannot change", 403);
  if (data && Object.hasOwn(data, "marketerEmail") && String(data.marketerEmail || "").toLowerCase() !== String(user.email || "").toLowerCase()) throw bad("Record owner cannot change", 403);
  if (!existing.exists && operation !== "delete" && !ownsDocument(data, identity)) throw bad("Record needs your account ID", 403);
  if (existing.exists && operation === "set" && !merge && !ownsDocument(data, identity)) throw bad("Record owner cannot be removed", 403);
}
function sendError(error, response, next) {
  if (error.status) return response.status(error.status).json({ error: error.message });
  if (/Invalid (?:document|collection) path|Unsupported query operator|An in filter needs values/.test(error.message || "")) return response.status(400).json({ error: error.message });
  next(error);
}

dataRoutes.post("/query", async (request, response, next) => {
  try {
    const path = request.body?.collectionPath;
    collectionAllowed(path, request.user);
    const docs = await scopedDocuments(path, filtersOf(request.body?.filters || []), request.user);
    response.json({ docs: docs.map((snapshot) => ({ path: snapshot.ref.path, data: snapshot.payload })) });
  } catch (error) { sendError(error, response, next); }
});
dataRoutes.post("/count", async (request, response, next) => {
  try {
    const path = request.body?.collectionPath;
    collectionAllowed(path, request.user);
    const filters = filtersOf(request.body?.filters || []);
    const count = request.user.role === "admin" || (!ownedCollections.has(rootOf(path)) && rootOf(path) !== "schools")
      ? await queryFor(path, filters).count().get().then((snapshot) => snapshot.data().count)
      : (await scopedDocuments(path, filters, request.user)).length;
    response.json({ count });
  } catch (error) { sendError(error, response, next); }
});
dataRoutes.get("/attendance/monthly", async (request, response, next) => {
  try {
    const month = String(request.query.month || "");
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw bad("Invalid month");
    const selectedId = request.user.role === "admin" ? String(request.query.marketerId || "") : String(request.user.marketerId || "");
    if (request.user.role === "admin" && (!selectedId || !/^[A-Za-z0-9_-]{1,200}$/.test(selectedId))) throw bad("Select a valid marketer");
    let email = String(request.user.email || "").trim().toLowerCase();
    if (request.user.role === "admin") {
      const marketer = await postgresDocumentStore().collection("marketers").doc(selectedId).get();
      if (!marketer.exists) return response.status(404).json({ error: "Marketer not found" });
      email = String(marketer.data().email || "").trim().toLowerCase();
    }
    const store = postgresDocumentStore().collection("attendance");
    const start = `${month}-01`;
    const end = `${month}-31`;
    const searches = await Promise.all([
      selectedId ? store.where("marketerId", "==", selectedId).where("date", ">=", start).where("date", "<=", end).select("date", "marketerId", "marketerEmail", "status", "startMarked", "startTime", "leaveTime").get() : { docs: [] },
      email ? store.where("marketerEmail", "==", email).where("date", ">=", start).where("date", "<=", end).select("date", "marketerId", "marketerEmail", "status", "startMarked", "startTime", "leaveTime").get() : { docs: [] }
    ]);
    const days = [...new Map(searches.flatMap((result) => result.docs).map((snapshot) => [snapshot.ref.path, snapshot])).values()]
      .map((snapshot) => snapshot.data())
      .filter((row) => String(row.date || "").startsWith(`${month}-`) && (
        (selectedId && row.marketerId === selectedId) ||
        (email && String(row.marketerEmail || "").trim().toLowerCase() === email)
      ))
      .map((row) => ({ date: row.date, status: row.status || "", startMarked: Boolean(row.startMarked), startTime: row.startTime || "", leaveTime: row.leaveTime || "" }));
    response.json({ days });
  } catch (error) { sendError(error, response, next); }
});
dataRoutes.get("/document", async (request, response, next) => {
  try {
    const path = request.query.path;
    documentAllowed(path, request.user);
    const snapshot = await postgresDocumentStore().doc(path).get();
    await assertCanRead(path, snapshot.data(), request.user);
    response.json({ data: snapshot.payload });
  } catch (error) { sendError(error, response, next); }
});
dataRoutes.put("/document", async (request, response, next) => {
  try {
    const ref = postgresDocumentStore().doc(request.query.path);
    const data = revive(request.body?.data);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw bad("Invalid document data");
    const merge = request.body?.merge === true;
    await assertCanWrite(ref, "set", data, request.user, merge);
    await ref.set(data, { merge });
    response.json({ saved: true });
  } catch (error) { sendError(error, response, next); }
});
dataRoutes.patch("/document", async (request, response, next) => {
  try {
    const ref = postgresDocumentStore().doc(request.query.path);
    const data = revive(request.body?.data);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw bad("Invalid document data");
    await assertCanWrite(ref, "update", data, request.user);
    await ref.update(data);
    response.json({ saved: true });
  } catch (error) { sendError(error, response, next); }
});
dataRoutes.delete("/document", async (request, response, next) => {
  try {
    const ref = postgresDocumentStore().doc(request.query.path);
    await assertCanWrite(ref, "delete", null, request.user);
    await ref.delete();
    response.status(204).end();
  } catch (error) { sendError(error, response, next); }
});
dataRoutes.post("/batch", async (request, response, next) => {
  try {
    const input = request.body?.operations;
    if (!Array.isArray(input) || !input.length || input.length > 400) throw bad("Choose 1 to 400 changes");
    const batch = postgresDocumentStore().batch();
    for (const item of input) {
      if (!["set", "update", "delete"].includes(item?.operation)) throw bad("Invalid batch action");
      const ref = postgresDocumentStore().doc(item.path);
      const data = item.operation === "delete" ? null : revive(item.data);
      if (item.operation !== "delete" && (!data || typeof data !== "object" || Array.isArray(data))) throw bad("Invalid document data");
      await assertCanWrite(ref, item.operation, data, request.user, item.merge === true);
      if (item.operation === "set") batch.set(ref, data, { merge: item.merge === true });
      else if (item.operation === "update") batch.update(ref, data);
      else batch.delete(ref);
    }
    await batch.commit();
    response.json({ saved: input.length });
  } catch (error) { sendError(error, response, next); }
});
