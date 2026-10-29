import { portalStore } from "../config/portalStore.js";
import { FieldValue } from "../config/portalStore.js";
import { sendNewsPush } from "./newsPushDelivery.js";

const ZONE = "Asia/Karachi";
const localParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
});

export const validScheduleDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export const validScheduleTime = (value) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

function partsAt(date) {
  return Object.fromEntries(localParts.formatToParts(date).filter((part) => part.type !== "literal")
    .map((part) => [part.type, part.value]));
}

export function pakistanDateKey(value) {
  const parts = partsAt(new Date(value));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function localScheduleToIso(date, time) {
  if (!validScheduleDate(date) || !validScheduleTime(time)) throw new Error("Choose a valid date and time.");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let utc = localAsUtc;
  for (let attempt = 0; attempt < 2; attempt++) {
    const parts = partsAt(new Date(utc));
    const zonedAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second));
    utc = localAsUtc - (zonedAsUtc - utc);
  }
  return new Date(utc).toISOString();
}

function nextDate(date) {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + 1);
  return day.toISOString().slice(0, 10);
}

export function nextMonSatRun(startDate, time, after = new Date()) {
  if (!validScheduleDate(startDate) || !validScheduleTime(time)) throw new Error("Choose a valid date and time.");
  const afterDate = new Date(after);
  let date = startDate > pakistanDateKey(afterDate) ? startDate : pakistanDateKey(afterDate);
  for (let day = 0; day < 8; day++) {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (weekday >= 1 && weekday <= 6) {
      const candidate = localScheduleToIso(date, time);
      if (Date.parse(candidate) > afterDate.getTime()) return candidate;
    }
    date = nextDate(date);
  }
  throw new Error("Could not calculate the next delivery time.");
}

export function initialScheduleRun({ repeat, date, time }, now = new Date()) {
  if (!validScheduleDate(date) || !validScheduleTime(time)) throw new Error("Choose a valid date and time.");
  if (repeat === "mon-sat") return nextMonSatRun(date, time, now);
  if (repeat !== "once") throw new Error("Choose a valid repeat option.");
  const runAt = localScheduleToIso(date, time);
  if (Date.parse(runAt) <= new Date(now).getTime()) throw new Error("Choose a future date and time.");
  return runAt;
}

async function claimSchedule(db, ref, now) {
  const leaseUntil = new Date(now.getTime() + 5 * 60_000).toISOString();
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    const item = snapshot.data();
    const runnable = ["pending", "active"].includes(item.status)
      || (item.status === "sending" && item.leaseUntil <= now.toISOString());
    if (!runnable || !item.nextRunAt || item.nextRunAt > now.toISOString()
      || (item.retryAfter && item.retryAfter > now.toISOString())) return null;
    transaction.update(ref, { status: "sending", leaseUntil, retryAfter: null });
    return { id: ref.id, ...item, leaseUntil };
  });
}

async function deliverSchedule(db, schedule, pushDelivery) {
  const marketers = await db.collection("marketers").get();
  const all = marketers.docs.map((item) => ({ id: item.id, ...item.data() }));
  const recipients = schedule.recipientIds.length
    ? all.filter((item) => schedule.recipientIds.includes(item.id)) : all;
  if (!recipients.length) throw new Error("No active marketers are available for this schedule.");
  const occurrenceDate = pakistanDateKey(schedule.nextRunAt);
  const newsId = schedule.repeat === "once" ? `scheduled_${schedule.id}` : `scheduled_${schedule.id}_${occurrenceDate}`;
  const newsRef = db.collection("news").doc(newsId);
  const existing = await newsRef.get();
  const record = existing.exists ? existing.data() : {
    kind: "general", title: "News", message: schedule.message,
    fromDate: null, toDate: null, recipientIds: recipients.map((item) => item.id),
    createdAt: new Date().toISOString(), createdBy: schedule.createdBy,
    scheduledAt: schedule.nextRunAt, scheduleId: schedule.id,
    status: "ready", deletedAt: null
  };
  if (!existing.exists) await newsRef.create(record).catch(async (error) => {
    if (error.code !== 6 && error.code !== "already-exists") throw error;
  });
  let push = { configured: false, delivered: 0, subscribed: 0 };
  try { push = await pushDelivery(db, recipients, { id: newsId, ...record }); }
  catch (error) { console.error("Scheduled news saved but push delivery failed:", error); }
  return { newsId, push };
}

export async function runDueNewsSchedules(db = portalStore(), now = new Date(), pushDelivery = sendNewsPush) {
  const snapshot = await db.collection("newsSchedules").where("nextRunAt", "<=", now.toISOString()).limit(100).get();
  let delivered = 0;
  for (const document of snapshot.docs) {
    const schedule = await claimSchedule(db, document.ref, now);
    if (!schedule) continue;
    try {
      const result = await deliverSchedule(db, schedule, pushDelivery);
      const nextRunAt = schedule.repeat === "mon-sat"
        ? nextMonSatRun(schedule.startDate, schedule.time, now) : null;
      await document.ref.update({
        status: nextRunAt ? "active" : "sent", nextRunAt: nextRunAt || FieldValue.delete(), leaseUntil: null,
        lastSentAt: new Date().toISOString(), lastNewsId: result.newsId,
        sentCount: Number(schedule.sentCount || 0) + 1, lastError: null, push: result.push
      });
      delivered++;
    } catch (error) {
      console.error("Scheduled news delivery failed:", schedule.id, error);
      await document.ref.update({
        status: schedule.repeat === "mon-sat" ? "active" : "pending", leaseUntil: null,
        retryAfter: new Date(Date.now() + 60_000).toISOString(), lastError: String(error.message || error).slice(0, 300)
      }).catch((updateError) => console.error("Scheduled news retry update failed:", updateError));
    }
  }
  return delivered;
}

export function startNewsScheduler() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await runDueNewsSchedules(); }
    catch (error) { console.error("News scheduler check failed:", error); }
    finally { running = false; }
  };
  void tick();
  const timer = setInterval(tick, 15_000);
  timer.unref?.();
  return () => clearInterval(timer);
}
