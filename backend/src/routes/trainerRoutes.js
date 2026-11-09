import { Router } from "express";
import { randomUUID } from "node:crypto";
import { portalStore } from "../config/portalStore.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { findTrainerById, listTrainers, saveTrainer, setTrainerArchived, updateTrainerProfilePhoto } from "../services/trainerService.js";
import { findMarketerById } from "../models/marketerModel.js";

export const trainerRoutes = Router();
trainerRoutes.use(requireAuth);
const collections = { attendance: "trainer_attendance", daily: "trainer_daily_plans", weekly: "trainer_weekly_plans" };
const fail = (response, message, code = 400) => response.status(code).json({ error: message });
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const validMonth = (value) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
const weeklyFields = (body, date) => {
  const toDate = String(body?.toDate || "");
  if (!validDate(date) || !validDate(toDate)) return null;
  const start = new Date(`${date}T00:00:00Z`);
  const end = new Date(`${toDate}T00:00:00Z`);
  if (start.getUTCDay() !== 1 || end.getUTCDay() === 0 || end < start || end - start > 5 * 86400000) return null;
  const dates = [];
  for (let day = new Date(start); day <= end; day.setUTCDate(day.getUTCDate() + 1)) dates.push(day.toISOString().slice(0, 10));
  const submitted = body?.days;
  if (!Array.isArray(submitted) || submitted.length !== dates.length || submitted.some((item, index) => item?.date !== dates[index] || typeof item.area !== "string" || typeof item.purpose !== "string" || !item.area.trim() || !item.purpose.trim())) return null;
  return { toDate, days: submitted.map((item) => ({ date: item.date, area: item.area.trim(), purpose: item.purpose.trim() })) };
};
const run = (handler) => async (request, response, next) => { try { await handler(request, response); } catch (error) { next(error); } };
const locationId = (value) => /^[A-Za-z0-9_-]{1,200}$/.test(String(value || ""));
const clean = (value) => String(value ?? "").trim();
const validPhoto = (value, maxKB) => {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value || "");
  if (!match) return false;
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > maxKB * 1024) return false;
  return match[1] === "jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : match[1] === "png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
};
const TRAINER_VISIT_PHOTO_KB = 80;
const trainerOnly = (request, response, next) => request.user.role === "trainer" ? next() : fail(response, "Trainer account required", 403);
const visitSummary = (snapshot) => { const { image, ...record } = snapshot.data(); return { id: snapshot.id, ...record, photoAvailable: Boolean(record.photoAvailable || image) }; };
const trainerCanSeeSchool = (school, trainerId) => school.source === "manual-trainer" ? school.addedByTrainerId === trainerId : school.source !== "manual-marketer";
const offlineTrainerAllowed = (user) => (user?.role === "trainer" && user.offlineMode !== "none") || (user?.role === "marketer" && ["trainer", "both"].includes(user.offlineMode));
const offlineTrainerId = (user) => user.role === "trainer" ? user.trainerId : `marketer_${user.marketerId}`;
const offlineSchoolVisible = (school, user) => school.source === "manual-marketer"
  ? user.role === "marketer" && String(school.addedByMarketerEmail || "").toLowerCase() === String(user.email || "").toLowerCase()
  : trainerCanSeeSchool(school, offlineTrainerId(user));

trainerRoutes.put("/me/photo", trainerOnly, run(async (request, response) => {
  const profilePhoto = await updateTrainerProfilePhoto(request.user.trainerId, request.body?.photo);
  if (profilePhoto === null) return fail(response, "Trainer account not found", 404);
  response.json({ profilePhoto });
}));
trainerRoutes.delete("/me/photo", trainerOnly, run(async (request, response) => {
  const trainer = await findTrainerById(request.user.trainerId);
  if (!trainer || trainer.deletedAt || trainer.active === false) return fail(response, "Trainer account not found", 404);
  await updateTrainerProfilePhoto(trainer.id, null);
  response.json({ profilePhoto: null });
}));

trainerRoutes.get("/dashboard-summary", run(async (request, response) => {
  if (!["admin", "trainer"].includes(request.user.role)) return fail(response, "Trainer access required", 403);
  const date = today();
  const [attendance, daily, visits] = await Promise.all([
    portalStore().collection("trainer_attendance").where("date", "==", date).select("trainerId", "status", "checkInAt").get(),
    portalStore().collection("trainer_daily_plans").where("date", "==", date).select("trainerId").get(),
    portalStore().collection("trainer_visits").where("date", "==", date).select("trainerId").get()
  ]);
  const trainerId = request.user.role === "trainer" ? request.user.trainerId : null;
  const belongs = (item) => !trainerId || item.trainerId === trainerId;
  const marked = attendance.docs.map((item) => item.data()).filter((item) => belongs(item) && (item.status === "leave" || (item.status === "present" && item.checkInAt)));
  const plans = daily.docs.map((item) => item.data()).filter(belongs);
  const visitCount = visits.docs.filter((item) => belongs(item.data())).length;
  response.json({ date, attendanceCount: new Set(marked.map((item) => item.trainerId)).size, attendanceMarked: marked.length > 0, dailyPlanCount: new Set(plans.map((item) => item.trainerId)).size, visitCount, dailyPlanMarked: plans.length > 0 });
}));

trainerRoutes.get("/attendance/holidays", run(async (request, response) => {
  const month = String(request.query.month || "");
  if (!validMonth(month)) return fail(response, "Invalid month");
  const snapshot = await portalStore().collection("gazetted_holidays").where("date", ">=", `${month}-01`).where("date", "<=", `${month}-31`).select("date", "name").get();
  response.json({ holidays: snapshot.docs.map((item) => item.data()).filter((item) => validDate(item.date)) });
}));
trainerRoutes.put("/attendance/holidays", requireAdmin, run(async (request, response) => {
  const date = String(request.body?.date || "");
  const name = clean(request.body?.name);
  if (!validDate(date) || !name || name.length > 100) return fail(response, "Enter a valid holiday date and name");
  await portalStore().collection("gazetted_holidays").doc(date).set({ date, name });
  response.json({ saved: true });
}));
trainerRoutes.delete("/attendance/holidays/:date", requireAdmin, run(async (request, response) => {
  if (!validDate(request.params.date)) return fail(response, "Invalid holiday date");
  await portalStore().collection("gazetted_holidays").doc(request.params.date).delete();
  response.status(204).end();
}));
trainerRoutes.get("/attendance/monthly", run(async (request, response) => {
  if (!["admin", "trainer"].includes(request.user.role)) return fail(response, "Trainer access required", 403);
  const month = String(request.query.month || "");
  if (!validMonth(month)) return fail(response, "Invalid month");
  const trainerId = request.user.role === "trainer" ? request.user.trainerId : String(request.query.trainerId || "");
  if (!locationId(trainerId)) return fail(response, "Select a valid trainer");
  if (request.user.role === "admin" && !(await findTrainerById(trainerId))) return fail(response, "Trainer not found", 404);
  const snapshot = await portalStore().collection("trainer_attendance").where("trainerId", "==", trainerId).where("date", ">=", `${month}-01`).where("date", "<=", `${month}-31`).select("date", "status", "checkInAt").get();
  response.json({ days: snapshot.docs.map((item) => ({ date: item.data().date, status: item.data().status || "", startMarked: Boolean(item.data().checkInAt), startTime: item.data().checkInAt ? new Date(item.data().checkInAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" }) : "" })).filter((item) => item.date.startsWith(`${month}-`)) });
}));
trainerRoutes.get("/attendance/monthly-all", requireAdmin, run(async (request, response) => {
  const month = String(request.query.month || "");
  if (!validMonth(month)) return fail(response, "Invalid month");
  const [trainers, attendance] = await Promise.all([
    listTrainers(),
    portalStore().collection("trainer_attendance").where("date", ">=", `${month}-01`).where("date", "<=", `${month}-31`).select("trainerId", "date", "status", "checkInAt").get()
  ]);
  const daysByTrainer = new Map(trainers.map((trainer) => [trainer.id, []]));
  for (const item of attendance.docs) {
    const row = item.data();
    if (!daysByTrainer.has(row.trainerId) || !String(row.date || "").startsWith(`${month}-`)) continue;
    daysByTrainer.get(row.trainerId).push({ date: row.date, status: row.status || "", startMarked: Boolean(row.checkInAt), startTime: row.checkInAt ? new Date(row.checkInAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" }) : "" });
  }
  response.json({ trainers: trainers.map((trainer) => ({ id: trainer.id, name: trainer.name, designation: trainer.designation, days: daysByTrainer.get(trainer.id) })) });
}));

trainerRoutes.get("/plan-for-date", trainerOnly, run(async (request, response) => {
  const date = String(request.query.date || "");
  if (!validDate(date)) return fail(response, "Valid date is required");
  const trainerId = request.user.trainerId;
  const daily = await portalStore().collection("trainer_daily_plans").doc(`${trainerId}_${date}`).get();
  if (daily.exists) return response.json({ source: "daily", plan: { area: daily.data().area || "", purpose: daily.data().purpose || "" } });
  const monday = new Date(`${date}T00:00:00Z`);
  if (monday.getUTCDay() === 0) return response.json({ source: null, plan: null });
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() - 1));
  const weekly = await portalStore().collection("trainer_weekly_plans").doc(`${trainerId}_${monday.toISOString().slice(0, 10)}`).get();
  const day = weekly.data()?.days?.find((item) => item.date === date);
  response.json({ source: day ? "weekly" : null, plan: day ? { area: day.area || "", purpose: day.purpose || "" } : null });
}));

trainerRoutes.get("/", requireAdmin, run(async (request, response) => response.json({ trainers: await listTrainers({ archived: request.query.archived === "1" }) })));
trainerRoutes.post("/", requireAdmin, run(async (request, response) => {
  response.status(201).json({ trainer: await saveTrainer(request.body || {}) });
}));
trainerRoutes.patch("/:id", requireAdmin, run(async (request, response) => {
  const trainer = await saveTrainer(request.body || {}, request.params.id);
  return trainer ? response.json({ trainer }) : fail(response, "Trainer not found", 404);
}));
trainerRoutes.patch("/:id/archive", requireAdmin, run(async (request, response) => {
  const trainer = await setTrainerArchived(request.params.id, true);
  return trainer ? response.json({ trainer }) : fail(response, "Active trainer not found", 404);
}));
trainerRoutes.patch("/:id/restore", requireAdmin, run(async (request, response) => {
  const trainer = await setTrainerArchived(request.params.id, false);
  return trainer ? response.json({ trainer }) : fail(response, "Old trainer not found", 404);
}));

trainerRoutes.get("/locations/cities", run(async (request, response) => {
  if (!["admin", "trainer"].includes(request.user.role)) return fail(response, "Trainer access required", 403);
  const result = await portalStore().collection("cities").get();
  response.json({ cities: result.docs.filter((snapshot) => snapshot.data().source !== "manual-trainer" || snapshot.data().addedByTrainerId === request.user.trainerId).map((snapshot) => ({ id: snapshot.id, name: snapshot.data().name || "" })).filter((city) => city.name).sort((a, b) => a.name.localeCompare(b.name)) });
}));
trainerRoutes.post("/locations/cities", trainerOnly, run(async (request, response) => {
  const name = clean(request.body?.name).replace(/\s+/g, " ");
  if (!name || name.length > 120) return fail(response, "Enter a city name under 120 characters");
  const result = await portalStore().collection("cities").get();
  const matching = result.docs.find((snapshot) => (snapshot.data().source !== "manual-trainer" || snapshot.data().addedByTrainerId === request.user.trainerId) && snapshot.data().name?.trim().toLowerCase() === name.toLowerCase());
  if (matching) return response.json({ city: { id: matching.id, name: matching.data().name }, existing: true });
  const record = { name, normalizedName: name.toLowerCase(), source: "manual-trainer", addedByTrainerId: request.user.trainerId, createdAt: new Date().toISOString() };
  const ref = portalStore().collection("cities").doc(randomUUID());
  await ref.create(record);
  response.status(201).json({ city: { id: ref.id, ...record } });
}));
trainerRoutes.get("/locations/areas", run(async (request, response) => {
  if (!["admin", "trainer"].includes(request.user.role)) return fail(response, "Trainer access required", 403);
  const cityId = String(request.query.cityId || "");
  if (!locationId(cityId)) return fail(response, "Select a valid city");
  const result = await portalStore().collection("areas").where("cityId", "==", cityId).get();
  response.json({ areas: result.docs.map((snapshot) => ({ id: snapshot.id, name: snapshot.data().name || "", cityId })).filter((area) => area.name).sort((a, b) => a.name.localeCompare(b.name)) });
}));
trainerRoutes.get("/locations/schools", run(async (request, response) => {
  if (!["admin", "trainer"].includes(request.user.role)) return fail(response, "Trainer access required", 403);
  const cityId = String(request.query.cityId || "");
  const areaId = String(request.query.areaId || "");
  if (!locationId(cityId || areaId)) return fail(response, "Select a valid city or area");
  const trainerId = request.user.trainerId;
  const result = await portalStore().collection("schools").where(cityId ? "cityId" : "areaId", "==", cityId || areaId).get();
  const schools = result.docs.filter((snapshot) => trainerCanSeeSchool(snapshot.data(), trainerId)).map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
  if (trainerId) {
    const details = await portalStore().collection("trainer_school_details").where("trainerId", "==", trainerId).get();
    const bySchool = new Map(details.docs.map((snapshot) => [snapshot.data().schoolId, snapshot.data().visitDetails]));
    schools.forEach((school) => { if (bySchool.has(school.id)) school.visitDetails = bySchool.get(school.id); });
  }
  response.json({ schools: schools.filter((school) => school.name).sort((a, b) => a.name.localeCompare(b.name)) });
}));
trainerRoutes.post("/locations/schools", trainerOnly, run(async (request, response) => {
  const cityId = String(request.body?.cityId || "");
  const areaId = String(request.body?.areaId || "");
  const name = clean(request.body?.name).replace(/\s+/g, " ");
  if (!locationId(cityId) || (areaId && !locationId(areaId)) || !name || name.length > 200) return fail(response, "Valid city and school name are required");
  const [city, area] = await Promise.all([portalStore().collection("cities").doc(cityId).get(), areaId ? portalStore().collection("areas").doc(areaId).get() : null]);
  if (!city.exists || (city.data().source === "manual-trainer" && city.data().addedByTrainerId !== request.user.trainerId) || (areaId && (!area.exists || area.data().cityId !== cityId))) return fail(response, "City and area do not match");
  const existing = await portalStore().collection("schools").where(areaId ? "areaId" : "cityId", "==", areaId || cityId).get();
  const matching = existing.docs.find((snapshot) => trainerCanSeeSchool(snapshot.data(), request.user.trainerId) && snapshot.data().name?.trim().toLowerCase() === name.toLowerCase());
  if (matching) return response.json({ school: { id: matching.id, ...matching.data() }, existing: true });
  const record = { name, normalizedName: name.toLowerCase(), cityId, cityName: city.data().name || "", areaId, areaName: area?.data().name || "", source: "manual-trainer", addedByTrainerId: request.user.trainerId, createdAt: new Date().toISOString() };
  const ref = portalStore().collection("schools").doc(randomUUID());
  await ref.create(record);
  response.status(201).json({ school: { id: ref.id, ...record } });
}));
trainerRoutes.patch("/locations/schools/:id", trainerOnly, run(async (request, response) => {
  const id = request.params.id;
  if (!locationId(id)) return fail(response, "Invalid school ID");
  const ref = portalStore().collection("schools").doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data().source !== "manual-trainer" || snapshot.data().addedByTrainerId !== request.user.trainerId) return fail(response, "School not found", 404);
  const name = clean(request.body?.name).replace(/\s+/g, " ");
  if (!name) return fail(response, "Valid school name is required");
  const areaId = snapshot.data().areaId;
  const siblings = await portalStore().collection("schools").where(areaId ? "areaId" : "cityId", "==", areaId || snapshot.data().cityId).get();
  if (siblings.docs.some((item) => item.id !== id && trainerCanSeeSchool(item.data(), request.user.trainerId) && item.data().name?.trim().toLowerCase() === name.toLowerCase())) return fail(response, "School name already exists in this city");
  await ref.update({ name, normalizedName: name.toLowerCase(), updatedAt: new Date().toISOString() });
  response.json({ school: { id, ...snapshot.data(), name } });
}));
trainerRoutes.delete("/locations/schools/:id", trainerOnly, run(async (request, response) => {
  const id = request.params.id;
  if (!locationId(id)) return fail(response, "Invalid school ID");
  const ref = portalStore().collection("schools").doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data().source !== "manual-trainer" || snapshot.data().addedByTrainerId !== request.user.trainerId) return fail(response, "School not found", 404);
  await ref.delete();
  response.status(204).end();
}));

trainerRoutes.get("/visits", run(async (request, response) => {
  if (!["admin", "trainer"].includes(request.user.role)) return fail(response, "Trainer access required", 403);
  const selectedId = request.user.role === "trainer" ? request.user.trainerId : String(request.query.trainerId || "");
  if (selectedId && !locationId(selectedId)) return fail(response, "Invalid trainer ID");
  let query = portalStore().collection("trainer_visits");
  if (selectedId) query = query.where("trainerId", "==", selectedId);
  query = query.select("trainerId", "trainerName", "trainerEmail", "date", "createdAt", "visitTime", "cityId", "cityName", "schoolId", "schoolName", "principalName", "phone", "notes", "photoAvailable");
  const result = await query.get();
  const records = result.docs.map(visitSummary).filter((item) => (!request.query.from || item.date >= request.query.from) && (!request.query.to || item.date <= request.query.to) && (!request.query.today || item.date === today())).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  response.json({ visits: records });
}));
trainerRoutes.post("/offline-visits", run(async (request, response) => {
  if (!offlineTrainerAllowed(request.user)) return fail(response, "Trainer offline visits are not enabled for this account", 403);
  const body = request.body || {};
  const offlineId = String(body.offlineId || "");
  if (!/^offline-[A-Za-z0-9_-]{12,100}$/.test(offlineId)) return fail(response, "Invalid offline visit ID");
  const trainerId = offlineTrainerId(request.user);
  const ref = portalStore().collection("trainer_visits").doc(offlineId);
  const previous = await ref.get();
  if (previous.exists) return previous.data().trainerId === trainerId
    ? response.json({ visit: visitSummary(previous), alreadySynced: true })
    : fail(response, "Offline visit ID already used", 409);
  const capturedAt = new Date(body.capturedAt);
  const now = new Date();
  if (Number.isNaN(capturedAt.getTime()) || capturedAt.getTime() > now.getTime() + 300000 || capturedAt.getTime() < now.getTime() - 90 * 86400000) return fail(response, "Offline visit date is invalid or too old");
  const cityName = clean(body.cityName).replace(/\s+/g, " ");
  const schoolName = clean(body.schoolName).replace(/\s+/g, " ");
  const principalName = clean(body.principalName), phone = clean(body.phone), notes = clean(body.notes);
  if (!cityName || cityName.length > 120 || !schoolName || schoolName.length > 200 || !principalName || principalName.length > 200 || !phone || phone.length > 100 || notes.length > 10000) return fail(response, "Enter a valid city, school, contact and phone");
  const image = String(body.image || "");
  if (!validPhoto(image, TRAINER_VISIT_PHOTO_KB)) return fail(response, `A valid school photo under ${TRAINER_VISIT_PHOTO_KB} KB is required`);
  const actor = request.user.role === "trainer" ? await findTrainerById(request.user.trainerId) : await findMarketerById(request.user.marketerId);
  if (!actor || actor.active === false) return fail(response, "Account inactive", 403);
  let city;
  if (locationId(body.cityId)) {
    const snapshot = await portalStore().collection("cities").doc(body.cityId).get();
    if (snapshot.exists && (snapshot.data().source !== "manual-trainer" || snapshot.data().addedByTrainerId === trainerId)) city = { id: snapshot.id, ...snapshot.data() };
  }
  if (!city) {
    const result = await portalStore().collection("cities").get();
    const found = result.docs.find((item) => item.data().name?.trim().toLowerCase() === cityName.toLowerCase() && (item.data().source !== "manual-trainer" || item.data().addedByTrainerId === trainerId));
    if (found) city = { id: found.id, ...found.data() };
    else {
      city = { id: randomUUID(), name: cityName, source: "manual-trainer", addedByTrainerId: trainerId, createdAt: now.toISOString() };
      const { id, ...data } = city;
      await portalStore().collection("cities").doc(id).create(data);
    }
  }
  let school;
  if (locationId(body.schoolId)) {
    const snapshot = await portalStore().collection("schools").doc(body.schoolId).get();
    if (snapshot.exists && snapshot.data().cityId === city.id && offlineSchoolVisible(snapshot.data(), request.user)) school = { id: snapshot.id, ...snapshot.data() };
  }
  if (!school) {
    const result = await portalStore().collection("schools").where("cityId", "==", city.id).get();
    const found = result.docs.find((item) => item.data().name?.trim().toLowerCase() === schoolName.toLowerCase() && offlineSchoolVisible(item.data(), request.user));
    if (found) school = { id: found.id, ...found.data() };
    else {
      school = { id: randomUUID(), name: schoolName, normalizedName: schoolName.toLowerCase(), cityId: city.id, cityName: city.name, areaId: "", areaName: "", source: "manual-trainer", addedByTrainerId: trainerId, createdAt: now.toISOString() };
      const { id, ...data } = school;
      await portalStore().collection("schools").doc(id).create(data);
    }
  }
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(capturedAt);
  const record = { trainerId, trainerName: actor.name || request.user.name, trainerEmail: actor.email || request.user.email, date, createdAt: capturedAt.toISOString(), syncedAt: now.toISOString(), visitTime: capturedAt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: "Asia/Karachi" }), cityId: city.id, cityName: city.name, areaId: school.areaId || "", areaName: school.areaName || "", schoolId: school.id, schoolName: school.name, principalName, phone, notes, image, photoAvailable: true, offlineVisit: true };
  const batch = portalStore().batch();
  batch.create(ref, record);
  batch.set(portalStore().collection("trainer_school_details").doc(`${trainerId}_${school.id}`), { trainerId, cityId: city.id, areaId: school.areaId || "", schoolId: school.id, visitDetails: { principalName, phone }, updatedAt: now.toISOString() });
  try { await batch.commit(); }
  catch (error) {
    if (error.code === 6 || error.code === "23505") {
      const saved = await ref.get();
      return saved.data()?.trainerId === trainerId ? response.json({ visit: visitSummary(saved), alreadySynced: true }) : fail(response, "Offline visit ID already used", 409);
    }
    throw error;
  }
  response.status(201).json({ visit: { id: ref.id, ...record, image: undefined } });
}));
trainerRoutes.get("/visits/:id/photo", run(async (request, response) => {
  if (!locationId(request.params.id)) return fail(response, "Invalid visit ID");
  const snapshot = await portalStore().collection("trainer_visits").doc(request.params.id).get();
  if (!snapshot.exists || (request.user.role !== "admin" && (request.user.role !== "trainer" || snapshot.data().trainerId !== request.user.trainerId))) return fail(response, "Visit not found", 404);
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(snapshot.data().image || "");
  if (!match) return fail(response, "Photo not found", 404);
  response.set("Cache-Control", "private, no-store").type(`image/${match[1]}`).send(Buffer.from(match[2], "base64"));
}));
trainerRoutes.post("/visits", trainerOnly, run(async (request, response) => {
  const body = request.body || {};
  const cityId = String(body.cityId || ""), areaId = String(body.areaId || ""), schoolId = String(body.schoolId || "");
  if (!locationId(cityId) || !locationId(schoolId) || (areaId && !locationId(areaId))) return fail(response, "Select a city and school");
  const [city, area, school, trainer] = await Promise.all([portalStore().collection("cities").doc(cityId).get(), areaId ? portalStore().collection("areas").doc(areaId).get() : null, portalStore().collection("schools").doc(schoolId).get(), findTrainerById(request.user.trainerId)]);
  if (!trainer || trainer.active === false) return fail(response, "Trainer account inactive", 403);
  if (!city.exists || (city.data().source === "manual-trainer" && city.data().addedByTrainerId !== request.user.trainerId) || !school.exists || (areaId && (!area.exists || area.data().cityId !== cityId || school.data().areaId !== areaId)) || school.data().cityId !== cityId || !trainerCanSeeSchool(school.data(), request.user.trainerId)) return fail(response, "Selected school does not belong to this city");
  const fields = Object.fromEntries(["principalName", "phone", "notes"].map((key) => [key, clean(body[key])]));
  if (!fields.principalName || !fields.phone) return fail(response, "Enter principal name and phone number");
  const image = String(body.image || "");
  if (!validPhoto(image, TRAINER_VISIT_PHOTO_KB)) return fail(response, `A valid school photo under ${TRAINER_VISIT_PHOTO_KB} KB is required`);
  const now = new Date();
  const record = { trainerId: request.user.trainerId, trainerName: trainer.name, trainerEmail: trainer.email, date: today(), createdAt: now.toISOString(), visitTime: now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: "Asia/Karachi" }), cityId, cityName: city.data().name || "", areaId, areaName: area?.data().name || school.data().areaName || "", schoolId, schoolName: school.data().name || "", ...fields, image, photoAvailable: true };
  const ref = portalStore().collection("trainer_visits").doc(randomUUID());
  const details = { trainerId: request.user.trainerId, cityId, areaId, schoolId, visitDetails: { principalName: fields.principalName, phone: fields.phone }, updatedAt: now.toISOString() };
  const batch = portalStore().batch();
  batch.create(ref, record);
  batch.set(portalStore().collection("trainer_school_details").doc(`${request.user.trainerId}_${schoolId}`), details);
  await batch.commit();
  response.status(201).json({ visit: { id: ref.id, ...visitSummary({ id: ref.id, data: () => record }) } });
}));

const expenseCategories = ["Travel", "Food", "Accommodation", "Training Materials", "Other"];
trainerRoutes.get("/expenses", run(async (request, response) => {
  if (!["admin", "trainer"].includes(request.user.role)) return fail(response, "Trainer access required", 403);
  const trainerId = request.user.role === "trainer" ? request.user.trainerId : clean(request.query.trainerId);
  if (trainerId && !locationId(trainerId)) return fail(response, "Invalid trainer ID");
  let query = portalStore().collection("trainer_expenses");
  if (trainerId) query = query.where("trainerId", "==", trainerId);
  const result = await query.get();
  const expenses = result.docs.map((snapshot) => {
    const { proof, ...record } = snapshot.data();
    return { id: snapshot.id, ...record, proofAvailable: Boolean(proof) };
  }).filter((item) => (!request.query.from || item.date >= request.query.from) && (!request.query.to || item.date <= request.query.to))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  response.json({ expenses });
}));
trainerRoutes.get("/expenses/:id/proof", run(async (request, response) => {
  if (!["admin", "trainer"].includes(request.user.role) || !locationId(request.params.id)) return fail(response, "Proof not found", 404);
  const snapshot = await portalStore().collection("trainer_expenses").doc(request.params.id).get();
  if (!snapshot.exists || (request.user.role === "trainer" && snapshot.data().trainerId !== request.user.trainerId)) return fail(response, "Proof not found", 404);
  const proof = snapshot.data().proof;
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(proof || "")) return fail(response, "Proof not found", 404);
  response.set("Cache-Control", "private, no-store").json({ proof });
}));
trainerRoutes.post("/expenses", trainerOnly, run(async (request, response) => {
  const date = clean(request.body?.date);
  const category = clean(request.body?.category);
  const otherCategory = clean(request.body?.otherCategory);
  const description = clean(request.body?.description);
  const amount = Number(request.body?.amount);
  const proof = String(request.body?.proof || "");
  if (!validDate(date) || date > today()) return fail(response, "Select a valid expense date up to today");
  if (!expenseCategories.includes(category)) return fail(response, "Select an expense category");
  if (category === "Other" && !otherCategory) return fail(response, "Describe the Other expense category");
  if (!description) return fail(response, "Expense description is required");
  if (!Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001 || amount > 100000000) return fail(response, "Enter a valid amount with up to two decimal places");
  if (!validPhoto(proof, 65)) return fail(response, "Take a valid expense proof photo under 65 KB before saving");
  const trainer = await findTrainerById(request.user.trainerId);
  if (!trainer || trainer.active === false || trainer.deletedAt) return fail(response, "Trainer account inactive", 403);
  const record = { trainerId: trainer.id, trainerName: trainer.name, date, category, otherCategory: category === "Other" ? otherCategory : "", description, amount, proof, createdAt: new Date().toISOString() };
  const ref = portalStore().collection("trainer_expenses").doc(randomUUID());
  await ref.create(record);
  const { proof: _proof, ...summary } = record;
  response.status(201).json({ expense: { id: ref.id, ...summary, proofAvailable: true } });
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
    .filter((item) => (!request.query.from || (request.params.kind === "weekly" ? (item.toDate || item.date) : item.date) >= request.query.from) && (!request.query.to || item.date <= request.query.to))
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
    if (action === "leave") record.remarks = String(request.body?.remarks || "").trim();
  } else if (kind === "weekly") {
    const fields = weeklyFields(request.body, date);
    if (!fields) return fail(response, "Select Monday through Saturday and enter area and purpose for every day");
    if (existing) return fail(response, "This week's plan already exists. Open All Weekly Plans to edit it.", 409);
    const previous = await portalStore().collection(collection).where("trainerId", "==", trainerId).select("date").get();
    if (previous.docs.some((item) => item.data().date >= date)) return fail(response, "Add a plan for a week after your latest saved plan.", 409);
    record = { trainerId, trainerName: trainer.name, date, ...fields, createdAt: now, updatedAt: now };
  } else {
    const area = String(request.body?.area || "").trim();
    const purpose = String(request.body?.purpose || "").trim();
    if (!area || !purpose) return fail(response, "Area and purpose are required");
    if (kind === "weekly" && new Date(`${date}T00:00:00Z`).getUTCDay() !== 1) return fail(response, "Weekly plan date must be a Monday");
    record = { trainerId, trainerName: trainer.name, date, area, purpose, createdAt: existing?.createdAt || now, updatedAt: now };
  }
  if (kind === "weekly") {
    try { await ref.create(record); }
    catch (error) { if (error.code === 6 || error.code === "23505") return fail(response, "This week's plan already exists. Open All Weekly Plans to edit it.", 409); throw error; }
  } else await ref.set(record);
  response.status(kind === "weekly" ? 201 : existing ? 200 : 201).json({ record: { id: ref.id, ...record } });
}));

trainerRoutes.patch("/records/weekly/:date", trainerOnly, run(async (request, response) => {
  const date = String(request.params.date || "");
  const fields = weeklyFields(request.body, date);
  if (!fields) return fail(response, "Select Monday through Saturday and enter area and purpose for every day");
  const trainerId = request.user.trainerId;
  const ref = portalStore().collection("trainer_weekly_plans").doc(`${trainerId}_${date}`);
  const saved = await ref.get();
  if (!saved.exists) return fail(response, "Weekly plan not found", 404);
  const record = { ...saved.data(), ...fields, updatedAt: new Date().toISOString() };
  await ref.update(record);
  response.json({ record: { id: ref.id, ...record } });
}));
