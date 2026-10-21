import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { firestore } from "../config/firebase.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const customReportRoutes = Router();
customReportRoutes.use(requireAuth, requireAdmin);

const collection = () => firestore().collection("customReports");
const defaultColumns = [
  { key: "date", label: "Date", type: "date" },
  { key: "name", label: "Name", type: "text" },
  { key: "number", label: "Number", type: "text" },
  { key: "city", label: "City", type: "text" },
  { key: "institute", label: "Institute", type: "text" },
  { key: "remarks", label: "Remarks", type: "remarks" }
];
const text = (value, max = 200) => typeof value === "string" && value.trim().length <= max ? value.trim() : null;
const validDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const bad = (response, message) => response.status(400).json({ error: message });
const reportColumns = (report) => Array.isArray(report.columns) && report.columns.length ? report.columns : defaultColumns;
const reportOptions = (value) => ({
  includeMarketers: value?.includeMarketers === true,
  dateRange: value?.dateRange === true,
  filterKeys: [...new Set((Array.isArray(value?.filterKeys) ? value.filterKeys : []).filter((key) => typeof key === "string" && /^[a-z][a-z0-9_]{0,39}$/.test(key)))].slice(0, 12)
});
function validateColumns(value, options) {
  if (!Array.isArray(value) || !value.length || value.length > 18) return null;
  const seen = new Set();
  const columns = [];
  for (const item of value) {
    const key = item?.key;
    const label = text(item?.label, 60);
    const type = item?.type;
    if (typeof key !== "string" || !/^[a-z][a-z0-9_]{0,39}$/.test(key) || !label || !["text", "date", "remarks", "marketer"].includes(type) || seen.has(key)) return null;
    seen.add(key);
    columns.push({ key, label, type });
  }
  if (!seen.has("date")) columns.unshift(defaultColumns[0]);
  if (options.includeMarketers && !seen.has("marketer")) columns.splice(1, 0, { key: "marketer", label: "Marketer", type: "marketer" });
  for (const key of ["city", "remarks"]) if (options.filterKeys.includes(key) && !seen.has(key)) {
    const column = defaultColumns.find((item) => item.key === key);
    columns.push(column);
    seen.add(key);
  }
  if (options.filterKeys.some((key) => !seen.has(key))) return null;
  return columns.length <= 20 ? columns : null;
}
function rowValue(value, column, fallbackDate) {
  if (column.type === "date") {
    const date = value || fallbackDate;
    return validDate(date) ? date : null;
  }
  return text(value ?? "", column.type === "remarks" ? 1000 : 300);
}

customReportRoutes.get("/", async (_request, response, next) => {
  try {
    const snapshot = await collection().orderBy("createdAt", "asc").get();
    response.json({ reports: snapshot.docs.filter((doc) => !doc.data().deletedAt).map((doc) => ({ id: doc.id, ...doc.data() })) });
  } catch (error) { next(error); }
});

customReportRoutes.get("/deleted", async (_request, response, next) => {
  try {
    const snapshot = await collection().orderBy("createdAt", "asc").get();
    response.json({ reports: snapshot.docs.filter((doc) => !!doc.data().deletedAt).map((doc) => ({ id: doc.id, ...doc.data() })) });
  } catch (error) { next(error); }
});

customReportRoutes.delete("/:id", async (request, response, next) => {
  try {
    const ref = collection().doc(request.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists) return response.status(404).json({ error: "Report not found" });
    await ref.update({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    response.status(204).end();
  } catch (error) { next(error); }
});

customReportRoutes.post("/:id/restore", async (request, response, next) => {
  try {
    const ref = collection().doc(request.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists) return response.status(404).json({ error: "Report not found" });
    await ref.update({ deletedAt: FieldValue.delete(), updatedAt: new Date().toISOString() });
    response.json({ restored: true });
  } catch (error) { next(error); }
});

customReportRoutes.post("/", async (request, response, next) => {
  try {
    const title = text(request.body?.title, 120);
    if (!title) return bad(response, "Report name is required (maximum 120 characters)");
    const date = request.body?.date;
    if (!validDate(date)) return bad(response, "A valid report date is required");
    const options = reportOptions(request.body?.options);
    const columns = request.body?.columns ? validateColumns(request.body.columns, options) : defaultColumns;
    if (!columns) return bad(response, "Invalid report headings");
    const report = { title, date, columns, options, rows: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const ref = await collection().add(report);
    response.status(201).json({ report: { id: ref.id, ...report } });
  } catch (error) { next(error); }
});

customReportRoutes.patch("/:id", async (request, response, next) => {
  try {
    const data = {};
    if ("title" in (request.body || {})) {
      data.title = text(request.body.title, 120);
      if (!data.title) return bad(response, "Report name is required (maximum 120 characters)");
    }
    if ("date" in (request.body || {})) {
      if (!validDate(request.body.date)) return bad(response, "A valid report date is required");
      data.date = request.body.date;
    }
    if ("options" in (request.body || {})) data.options = reportOptions(request.body.options);
    const ref = collection().doc(request.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists) return response.status(404).json({ error: "Report not found" });
    if ("columns" in (request.body || {})) {
      data.columns = validateColumns(request.body.columns, data.options || reportOptions(snapshot.data().options));
      if (!data.columns) return bad(response, "Invalid report headings");
    }
    if (!Object.keys(data).length) return bad(response, "No report changes provided");
    await ref.update({ ...data, updatedAt: new Date().toISOString() });
    response.json({ updated: true });
  } catch (error) { next(error); }
});

customReportRoutes.post("/:id/rows", async (request, response, next) => {
  try {
    const ref = collection().doc(request.params.id);
    const result = await firestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return { missing: true };
      const row = { id: collection().doc().id, verificationNumber: "", verificationRemark: "", verificationCustomRemark: "" };
      for (const column of reportColumns(snapshot.data())) {
        row[column.key] = rowValue(request.body?.[column.key], column, snapshot.data().date);
        if (row[column.key] === null) return { invalid: column.label };
      }
      for (const key of ["verificationNumber", "verificationRemark", "verificationCustomRemark"]) {
        if (key in (request.body || {})) {
          row[key] = text(request.body[key], key === "verificationCustomRemark" ? 1000 : 300);
          if (row[key] === null) return { invalid: key };
        }
      }
      transaction.update(ref, { rows: FieldValue.arrayUnion(row), updatedAt: new Date().toISOString() });
      return { row };
    });
    if (result.missing) return response.status(404).json({ error: "Report not found" });
    if (result.invalid) return bad(response, `Invalid ${result.invalid}`);
    response.status(201).json({ row: result.row });
  } catch (error) { next(error); }
});

customReportRoutes.patch("/:id/rows/:rowId", async (request, response, next) => {
  try {
    const ref = collection().doc(request.params.id);
    const result = await firestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return "report-missing";
      const changes = {};
      for (const column of reportColumns(snapshot.data())) if (column.key in (request.body || {})) {
        changes[column.key] = rowValue(request.body[column.key], column, snapshot.data().date);
        if (changes[column.key] === null) return `invalid:${column.label}`;
      }
      for (const key of ["verificationNumber", "verificationRemark", "verificationCustomRemark"]) if (key in (request.body || {})) {
        changes[key] = text(request.body[key], key === "verificationCustomRemark" ? 1000 : 300);
        if (changes[key] === null) return `invalid:${key}`;
      }
      if (!Object.keys(changes).length) return "no-changes";
      const rows = snapshot.data().rows || [];
      const index = rows.findIndex((row) => row.id === request.params.rowId);
      if (index < 0) return "row-missing";
      rows[index] = { ...rows[index], ...changes };
      transaction.update(ref, { rows, updatedAt: new Date().toISOString() });
      return "updated";
    });
    if (result.startsWith("invalid:")) return bad(response, `Invalid ${result.slice(8)}`);
    if (result === "no-changes") return bad(response, "No row changes provided");
    if (result !== "updated") return response.status(404).json({ error: result === "report-missing" ? "Report not found" : "Row not found" });
    response.json({ updated: true });
  } catch (error) { next(error); }
});

customReportRoutes.delete("/:id/rows/:rowId", async (request, response, next) => {
  try {
    const ref = collection().doc(request.params.id);
    const result = await firestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return false;
      transaction.update(ref, { rows: (snapshot.data().rows || []).filter((row) => row.id !== request.params.rowId), updatedAt: new Date().toISOString() });
      return true;
    });
    if (!result) return response.status(404).json({ error: "Report not found" });
    response.status(204).end();
  } catch (error) { next(error); }
});
