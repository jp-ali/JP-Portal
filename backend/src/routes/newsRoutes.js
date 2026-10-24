import { createHash } from "node:crypto";
import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import webPush from "web-push";
import { firestore } from "../config/firebase.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

export const newsRoutes = Router();
newsRoutes.use(requireAuth);

const validDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const pushReady = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
const subscriptionId = (endpoint) => createHash("sha256").update(endpoint).digest("hex");

function configurePush() {
  if (!pushReady()) return false;
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT || `mailto:${process.env.ADMIN_EMAIL || "admin@portal.com"}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  return true;
}

newsRoutes.get("/", async (request, response, next) => {
  try {
    const snapshot = await firestore().collection("news").orderBy("createdAt", "desc").limit(200).get();
    response.json({ news: snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) });
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
    await firestore().collection("pushSubscriptions").doc(subscriptionId(endpoint)).set({
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
    const ref = firestore().collection("pushSubscriptions").doc(subscriptionId(endpoint));
    const snapshot = await ref.get();
    if (snapshot.exists && snapshot.data().marketerId === request.user.marketerId) await ref.delete();
    response.json({ removed: true });
  } catch (error) { next(error); }
});

newsRoutes.post("/", requireAdmin, async (request, response, next) => {
  const title = String(request.body?.title || "").trim();
  const message = String(request.body?.message || "").trim();
  const fromDate = request.body?.fromDate;
  const toDate = request.body?.toDate;
  if (!title || title.length > 120 || message.length > 1000 || !validDate(fromDate) || !validDate(toDate) || fromDate > toDate) {
    return response.status(400).json({ error: "Enter a title and valid From/To dates. Message can contain up to 1,000 characters." });
  }
  try {
    const db = firestore();
    const createdAt = new Date().toISOString();
    const ref = await db.collection("news").add({ title, message, fromDate, toDate, createdAt, createdBy: request.user.email });
    const news = { id: ref.id, title, message, fromDate, toDate, createdAt };
    try {
      if (!configurePush()) return response.status(201).json({ news, push: { configured: false, delivered: 0, subscribed: 0 } });

      const [marketers, subscriptions] = await Promise.all([
        db.collection("marketers").get(), db.collection("pushSubscriptions").get()
      ]);
      const activeIds = new Set(marketers.docs.map((item) => item.id));
      const targets = subscriptions.docs.filter((item) => activeIds.has(item.data().marketerId));
      const payload = JSON.stringify({ title, body: message || `Your expense report for ${fromDate} to ${toDate} is ready.`, newsId: ref.id });
      let delivered = 0;
      for (let start = 0; start < targets.length; start += 25) {
        const batch = targets.slice(start, start + 25);
        const results = await Promise.allSettled(batch.map((item) => webPush.sendNotification({
          endpoint: item.data().endpoint, keys: item.data().keys
        }, payload, { TTL: 86400 })));
        await Promise.all(results.map(async (result, index) => {
          if (result.status === "fulfilled") { delivered++; return; }
          if ([404, 410].includes(result.reason?.statusCode)) await batch[index].ref.delete().catch(() => {});
          else console.error("News push failed:", result.reason?.message || result.reason);
        }));
      }
      return response.status(201).json({ news, push: { configured: true, delivered, subscribed: targets.length } });
    } catch (pushError) {
      console.error("News was saved but push delivery failed:", pushError);
      return response.status(201).json({ news, push: { configured: false, delivered: 0, subscribed: 0, error: "Push delivery failed" } });
    }
  } catch (error) { next(error); }
});
