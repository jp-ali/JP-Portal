import { Router } from "express";
import { portalStore } from "../config/portalStore.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { findTrainerById, listTrainers, saveTrainer } from "../services/trainerService.js";

export const trainerRoutes = Router();
trainerRoutes.use(requireAuth);
const collections = { attendance: "trainer_attendance", daily: "trainer_daily_plans", weekly: "trainer_weekly_plans" };
const fail = (response, message, code = 400) => response.status(code).json({ error: message });
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const run = (handler) => async (request, response, next) => { try { await handler(request, response); } catch (error) { next(error); } };

trainerRoutes.get("/", requireAdmin, run(async (_request, response) => response.json({ trainers: await listTrainers() })));
trainerRoutes.post("/", requireAdmin, run(async (request, response) => {
  response.status(201).json({ trainer: await saveTrainer(request.body || {}) });
}));
trainerRoutes.patch("/:id", requireAdmin, run(async (request, response) => {
  const trainer = await saveTrainer(request.body || {}, request.params.id);
  return trainer ? response.json({ trainer }) : fail(response, "Trainer not found", 404);
}));

trainerRoutes.get("/records/:kind", run(async (request, response) => {
  const collection = collections[request.params.kind];
  if (!collection) return fail(response, "Unknown record type", 404);
  if (!["admin", "trainer"].includes(request.user.role)) return fail(response, "Trainer access required", 403);
  const trainerId = request.user.role === "trainer" ? request.user.trainerId : String(request.query.trainerId || "");
  let query = portalStore().collection(collection);
  if (trainerId) query = query.where("trainerId", "==", trainerId);
  const result = await query.get();
  const records = result.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
    .filter((item) => (!request.query.from || item.date >= request.query.from) && (!request.query.to || item.date <= request.query.to))
    .sort((a, b) => b.date.localeCompare(a.date));
  response.json({ records });
}));

trainerRoutes.post("/records/:kind", run(async (request, response) => {
  const kind = request.params.kind;
  const collection = collections[kind];
  if (!collection) return fail(response, "Unknown record type", 404);
  if (request.user.role !== "trainer") return fail(response, "Trainer account required", 403);
  const date = String(request.body?.date || today());
  if (!validDate(date)) return fail(response, "Valid date is required");
  if (kind === "attendance" && date !== today()) return fail(response, "Attendance can only be marked for today");
  const trainerId = request.user.trainerId;
  const trainer = await findTrainerById(trainerId);
  if (!trainer || trainer.active === false) return fail(response, "Trainer account inactive", 403);
  const ref = portalStore().collection(collection).doc(`${trainerId}_${date}`);
  const existing = (await ref.get()).data();
  const now = new Date().toISOString();
  let record;
  if (kind === "attendance") {
    const action = String(request.body?.action || "");
    if (!["check-in", "check-out", "leave"].includes(action)) return fail(response, "Invalid attendance action");
    if (action === "check-in" && existing) return fail(response, "Attendance already marked today");
    if (action === "leave" && existing) return fail(response, "Attendance already marked today");
    if (action === "check-out" && (!existing?.checkInAt || existing.checkOutAt)) return fail(response, "Check in before checking out");
    record = { ...existing, trainerId, trainerName: trainer.name, date, status: action === "leave" ? "leave" : "present", updatedAt: now };
    if (action === "check-in") record.checkInAt = now;
    if (action === "check-out") record.checkOutAt = now;
    if (action === "leave") record.remarks = String(request.body?.remarks || "").trim().slice(0, 500);
  } else {
    const area = String(request.body?.area || "").trim();
    const purpose = String(request.body?.purpose || "").trim();
    if (!area || !purpose || area.length > 200 || purpose.length > 2000) return fail(response, "Area and purpose are required (within 200 and 2000 characters)");
    if (kind === "weekly" && new Date(`${date}T00:00:00Z`).getUTCDay() !== 1) return fail(response, "Weekly plan date must be a Monday");
    record = { trainerId, trainerName: trainer.name, date, area, purpose, createdAt: existing?.createdAt || now, updatedAt: now };
  }
  await ref.set(record);
  response.status(existing ? 200 : 201).json({ record: { id: ref.id, ...record } });
}));
