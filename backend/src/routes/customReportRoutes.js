import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { firestore } from "../config/firebase.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const customReportRoutes = Router();
customReportRoutes.use(requireAuth, requireAdmin);

const collection = () => firestore().collection("customReports");
const fields = ["name", "number", "city", "institute", "remarks"];
const text = (value, max = 200) => typeof value === "string" && value.trim().length <= max ? value.trim() : null;
const validDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const bad = (response, message) => response.status(400).json({ error: message });

customReportRoutes.get("/", async (_request, response, next) => {
  try {
    const snapshot = await collection().orderBy("createdAt", "asc").get();
    response.json({ reports: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
  } catch (error) { next(error); }
});

customReportRoutes.post("/", async (request, response, next) => {
  try {
    const title = text(request.body?.title, 120);
    if (!title) return bad(response, "Report name is required (maximum 120 characters)");
    const date = request.body?.date;
    if (!validDate(date)) return bad(response, "A valid report date is required");
    const report = { title, date, rows: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
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
    if (!Object.keys(data).length) return bad(response, "No report changes provided");
    const ref = collection().doc(request.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists) return response.status(404).json({ error: "Report not found" });
    await ref.update({ ...data, updatedAt: new Date().toISOString() });
    response.json({ updated: true });
  } catch (error) { next(error); }
});

customReportRoutes.post("/:id/rows", async (request, response, next) => {
  try {
    const row = {};
    for (const field of fields) {
      row[field] = text(request.body?.[field] ?? "", field === "remarks" ? 1000 : 300);
      if (row[field] === null) return bad(response, `Invalid ${field}`);
    }
    row.id = collection().doc().id;
    const ref = collection().doc(request.params.id);
    const result = await firestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return false;
      transaction.update(ref, { rows: FieldValue.arrayUnion(row), updatedAt: new Date().toISOString() });
      return true;
    });
    if (!result) return response.status(404).json({ error: "Report not found" });
    response.status(201).json({ row });
  } catch (error) { next(error); }
});

customReportRoutes.patch("/:id/rows/:rowId", async (request, response, next) => {
  try {
    const changes = {};
    for (const field of fields) if (field in (request.body || {})) {
      changes[field] = text(request.body[field], field === "remarks" ? 1000 : 300);
      if (changes[field] === null) return bad(response, `Invalid ${field}`);
    }
    if (!Object.keys(changes).length) return bad(response, "No row changes provided");
    const ref = collection().doc(request.params.id);
    const result = await firestore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return "report-missing";
      const rows = snapshot.data().rows || [];
      const index = rows.findIndex((row) => row.id === request.params.rowId);
      if (index < 0) return "row-missing";
      rows[index] = { ...rows[index], ...changes };
      transaction.update(ref, { rows, updatedAt: new Date().toISOString() });
      return "updated";
    });
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
