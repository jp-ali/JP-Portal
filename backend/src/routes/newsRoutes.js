import { createHash } from "node:crypto";
import { Router } from "express";
import { FieldValue } from "../config/portalStore.js";
import { portalStore } from "../config/portalStore.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { createExpenseNewsPdf, expenseNewsRows } from "../services/expenseNewsPdf.js";
import { pushReady, sendNewsPush } from "../services/newsPushDelivery.js";
import { initialScheduleRun } from "../services/newsScheduler.js";

export const newsRoutes = Router();
newsRoutes.use(requireAuth);

const validDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const subscriptionId = (endpoint) => createHash("sha256").update(endpoint).digest("hex");

function visibleTo(news, user) {
  if (user.role === "admin") return true;
  return !news.deletedAt && news.status !== "preparing"
    && (!Array.isArray(news.recipientIds) || news.recipientIds.includes(user.marketerId));
}

newsRoutes.get("/", async (request, response, next) => {
  try {
    const snapshot = await portalStore().collection("news").orderBy("createdAt", "desc").limit(200).get();
    const news = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
      .filter((item) => visibleTo(item, request.user));
    if (request.user.role === "marketer") {
      const reads = await portalStore().collection("marketerNewsReads").doc(request.user.marketerId).collection("items").get();
      const readIds = new Set(reads.docs.map((item) => item.id));
      response.json({ news: news.map((item) => ({ ...item, read: readIds.has(item.id) })) });
    } else response.json({ news });
  } catch (error) { next(error); }
});

newsRoutes.post("/read", async (request, response, next) => {
  if (request.user.role !== "marketer") return response.status(403).json({ error: "Marketer account required" });
  const ids = request.body?.ids;
  if (!Array.isArray(ids) || ids.length > 200 || ids.some((id) => typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(id))) {
    return response.status(400).json({ error: "Invalid news selection" });
  }
  try {
    const db = portalStore();
    const uniqueIds = [...new Set(ids)];
    const documents = await Promise.all(uniqueIds.map((id) => db.collection("news").doc(id).get()));
    const batch = db.batch();
    let marked = 0;
    documents.forEach((item) => {
      if (!item.exists || !visibleTo(item.data(), request.user)) return;
      batch.set(db.collection("marketerNewsReads").doc(request.user.marketerId).collection("items").doc(item.id),
        { readAt: new Date().toISOString() });
      marked++;
    });
    if (marked) await batch.commit();
    response.json({ marked });
  } catch (error) { next(error); }
});

newsRoutes.get("/push-key", (request, response) => {
  response.json({ publicKey: request.user.role === "marketer" && pushReady() ? process.env.VAPID_PUBLIC_KEY : null });
});

newsRoutes.post("/subscription", async (request, response, next) => {
  if (request.user.role !== "marketer") return response.status(403).json({ error: "Marketer account required" });
  const subscription = request.body?.subscription;
  const endpoint = subscription?.endpoint;
  const p256dh = subscription?.keys?.p256dh;
  const auth = subscription?.keys?.auth;
  if (typeof endpoint !== "string" || endpoint.length > 2048 || !endpoint.startsWith("https://")
    || typeof p256dh !== "string" || p256dh.length > 512
    || typeof auth !== "string" || auth.length > 512 || !p256dh || !auth) {
    return response.status(400).json({ error: "Invalid push subscription" });
  }
  try {
    await portalStore().collection("pushSubscriptions").doc(subscriptionId(endpoint)).set({
      marketerId: request.user.marketerId, endpoint, keys: { p256dh, auth }, updatedAt: FieldValue.serverTimestamp()
    });
    response.json({ saved: true });
  } catch (error) { next(error); }
});

newsRoutes.delete("/subscription", async (request, response, next) => {
  if (request.user.role !== "marketer") return response.status(403).json({ error: "Marketer account required" });
  const endpoint = request.body?.endpoint;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) return response.status(400).json({ error: "Invalid subscription" });
  try {
    const ref = portalStore().collection("pushSubscriptions").doc(subscriptionId(endpoint));
    const snapshot = await ref.get();
    if (snapshot.exists && snapshot.data().marketerId === request.user.marketerId) await ref.delete();
    response.json({ removed: true });
  } catch (error) { next(error); }
});

newsRoutes.get("/schedules", requireAdmin, async (_request, response, next) => {
  try {
    const snapshot = await portalStore().collection("newsSchedules").orderBy("createdAt", "desc").limit(200).get();
    response.json({ schedules: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) });
  } catch (error) { next(error); }
});

newsRoutes.post("/schedules", requireAdmin, async (request, response, next) => {
  const message = String(request.body?.message || "").trim();
  const repeat = request.body?.repeat;
  const date = request.body?.date;
  const time = request.body?.time;
  const selectedIds = request.body?.recipientIds;
  if (!message || !Array.isArray(selectedIds)
    || selectedIds.some((id) => typeof id !== "string" || id.length > 200)) {
    return response.status(400).json({ error: "Enter news text and a valid marketer selection." });
  }
  let nextRunAt;
  try { nextRunAt = initialScheduleRun({ repeat, date, time }); }
  catch (error) { return response.status(400).json({ error: error.message }); }
  try {
    const db = portalStore();
    const marketers = await db.collection("marketers").get();
    const all = marketers.docs.map((item) => ({ id: item.id }));
    const ids = [...new Set(selectedIds)];
    if (ids.some((id) => !all.some((item) => item.id === id))) {
      return response.status(400).json({ error: "A selected marketer is no longer active. Refresh and select again." });
    }
    if (!(ids.length || all.length)) return response.status(400).json({ error: "No active marketers are available." });
    const ref = db.collection("newsSchedules").doc();
    const schedule = {
      message, recipientIds: ids, repeat, startDate: date, time,
      nextRunAt, status: repeat === "once" ? "pending" : "active",
      createdAt: new Date().toISOString(), createdBy: request.user.email,
      sentCount: 0, lastSentAt: null, lastNewsId: null, leaseUntil: null, retryAfter: null, lastError: null
    };
    await ref.set(schedule);
    response.status(201).json({ schedule: { id: ref.id, ...schedule } });
  } catch (error) { next(error); }
});

newsRoutes.delete("/schedules/:id", requireAdmin, async (request, response, next) => {
  try {
    const ref = portalStore().collection("newsSchedules").doc(request.params.id);
    const result = await portalStore().runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return "missing";
      if (snapshot.data().status === "sending") return "sending";
      if (!["pending", "active"].includes(snapshot.data().status)) return "finished";
      transaction.update(ref, { status: "cancelled", nextRunAt: FieldValue.delete(), cancelledAt: new Date().toISOString() });
      return "cancelled";
    });
    if (result === "missing") return response.status(404).json({ error: "Scheduled news not found." });
    if (result !== "cancelled") return response.status(409).json({ error: result === "sending" ? "This news is already being sent." : "This schedule has finished." });
    response.json({ cancelled: true });
  } catch (error) { next(error); }
});

newsRoutes.post("/", requireAdmin, async (request, response, next) => {
  const kind = ["general", "expense"].includes(request.body?.kind) ? request.body.kind : "";
  const message = String(request.body?.message || "").trim();
  const fromDate = request.body?.fromDate;
  const toDate = request.body?.toDate;
  const selectedIds = request.body?.recipientIds;
  if (!kind || (kind === "general" && !message)
    || (kind === "expense" && (!validDate(fromDate) || !validDate(toDate) || fromDate > toDate))
    || (selectedIds !== undefined && (!Array.isArray(selectedIds) || selectedIds.some((id) => typeof id !== "string" || id.length > 200)))) {
    return response.status(400).json({ error: "Enter news text or a valid expense date range and marketer selection." });
  }
  try {
    const db = portalStore();
    const marketers = await db.collection("marketers").get();
    const all = marketers.docs.map((item) => ({ id: item.id, ...item.data() }));
    const ids = [...new Set(selectedIds || [])];
    if (ids.some((id) => !all.some((item) => item.id === id))) return response.status(400).json({ error: "A selected marketer is no longer active. Refresh and select again." });
    const recipients = ids.length ? all.filter((item) => ids.includes(item.id)) : all;
    if (!recipients.length) return response.status(400).json({ error: "No active marketers are available." });
    const title = kind === "expense" ? "Expense Report" : "News";
    const createdAt = new Date().toISOString();
    const ref = db.collection("news").doc();
    const record = {
      kind, title, message: kind === "expense" ? `Expense report for ${fromDate} to ${toDate}` : message,
      fromDate: kind === "expense" ? fromDate : null, toDate: kind === "expense" ? toDate : null,
      recipientIds: recipients.map((item) => item.id), createdAt, createdBy: request.user.email,
      status: kind === "expense" ? "preparing" : "ready", deletedAt: null
    };
    await ref.set(record);
    if (kind === "expense") {
      const rateDocs = await db.collection("petrol_rates").get();
      const rates = {};
      rateDocs.docs.forEach((item) => {
        const rate = Number(item.data().rate);
        if (Number.isFinite(rate) && rate >= 0) rates[String(item.data().date || item.id)] = rate;
      });
      for (const marketer of recipients) {
        const attendance = await db.collection("attendance").where("marketerEmail", "==", marketer.email).get();
        const records = attendance.docs.map((item) => item.data()).filter((row) => row.date >= fromDate && row.date <= toDate);
        const pdf = await createExpenseNewsPdf({ marketer, rows: expenseNewsRows(records, marketer, rates), fromDate, toDate });
        const reportRef = ref.collection("reports").doc(marketer.id);
        const chunkSize = 350000;
        const chunks = Math.ceil(pdf.length / chunkSize);
        await reportRef.set({ chunks, bytes: pdf.length });
        for (let index = 0; index < chunks; index++) {
          await reportRef.collection("chunks").doc(String(index)).set({ data: pdf.subarray(index * chunkSize, (index + 1) * chunkSize).toString("base64") });
        }
      }
      await ref.update({ status: "ready" });
    }
    const news = { id: ref.id, ...record, status: "ready" };
    let push;
    try { push = await sendNewsPush(db, recipients, news); }
    catch (error) {
      console.error("News saved but push delivery failed:", error);
      push = { configured: false, delivered: 0, subscribed: 0, error: "Push delivery failed" };
    }
    response.status(201).json({ news, push, recipients: recipients.length });
  } catch (error) { next(error); }
});

newsRoutes.get("/:id/report", async (request, response, next) => {
  try {
    const ref = portalStore().collection("news").doc(request.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists || !visibleTo(snapshot.data(), request.user) || snapshot.data().kind !== "expense" || snapshot.data().status !== "ready") {
      return response.status(404).json({ error: "Expense report not found" });
    }
    const marketerId = request.user.role === "admin" ? String(request.query.marketerId || "") : request.user.marketerId;
    if (!marketerId || !snapshot.data().recipientIds?.includes(marketerId)) return response.status(403).json({ error: "Report access denied" });
    const report = await ref.collection("reports").doc(marketerId).get();
    if (!report.exists) return response.status(404).json({ error: "Expense report not found" });
    const chunks = [];
    for (let index = 0; index < report.data().chunks; index++) {
      const part = await report.ref.collection("chunks").doc(String(index)).get();
      if (!part.exists) return response.status(500).json({ error: "Expense report is incomplete" });
      chunks.push(Buffer.from(part.data().data, "base64"));
    }
    if (request.user.role === "marketer") {
      await portalStore().collection("marketerNewsReads").doc(marketerId).collection("items").doc(request.params.id)
        .set({ readAt: new Date().toISOString() });
    }
    response.set("Content-Type", "application/pdf");
    response.set("Content-Disposition", `${request.query.download === "1" ? "attachment" : "inline"}; filename="expense-report-${request.params.id}.pdf"`);
    response.send(Buffer.concat(chunks));
  } catch (error) { next(error); }
});

newsRoutes.patch("/:id/delete", requireAdmin, async (request, response, next) => {
  try {
    const ref = portalStore().collection("news").doc(request.params.id);
    if (!(await ref.get()).exists) return response.status(404).json({ error: "News not found" });
    await ref.update({ deletedAt: new Date().toISOString() });
    response.json({ deleted: true });
  } catch (error) { next(error); }
});

newsRoutes.patch("/:id/restore", requireAdmin, async (request, response, next) => {
  try {
    const ref = portalStore().collection("news").doc(request.params.id);
    if (!(await ref.get()).exists) return response.status(404).json({ error: "News not found" });
    await ref.update({ deletedAt: null });
    response.json({ restored: true });
  } catch (error) { next(error); }
});
