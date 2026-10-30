import webPush from "web-push";

export const pushReady = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

function configurePush() {
  if (!pushReady()) return false;
  webPush.setVapidDetails(process.env.VAPID_SUBJECT || `mailto:${process.env.ADMIN_EMAIL || "admin@portal.com"}`,
    process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  return true;
}

export async function sendPushWithRetry(subscription, payload, send = webPush.sendNotification, wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await send(subscription, payload, { TTL: 86400 }); }
    catch (error) {
      const status = Number(error?.statusCode);
      if (attempt === 2 || (status !== 429 && (status < 500 || status > 599))) throw error;
      await wait(500 * 2 ** attempt);
    }
  }
}

export async function sendNewsPush(db, recipients, news) {
  if (!configurePush()) return { configured: false, delivered: 0, subscribed: 0 };
  const ids = new Set(recipients.map((item) => item.id));
  const subscriptions = await db.collection("pushSubscriptions").get();
  const targets = subscriptions.docs.filter((item) => ids.has(item.data().marketerId));
  const fullMessage = news.message || `Your expense report for ${news.fromDate} to ${news.toDate} is ready.`;
  const preview = Array.from(fullMessage);
  const payload = JSON.stringify({
    title: news.title, body: preview.length > 180 ? `${preview.slice(0, 180).join("")}…` : fullMessage,
    newsId: news.id
  });
  let delivered = 0;
  for (let start = 0; start < targets.length; start += 25) {
    const batch = targets.slice(start, start + 25);
    const results = await Promise.allSettled(batch.map((item) => sendPushWithRetry({
      endpoint: item.data().endpoint, keys: item.data().keys
    }, payload)));
    await Promise.all(results.map(async (result, index) => {
      if (result.status === "fulfilled") { delivered++; return; }
      if ([404, 410].includes(result.reason?.statusCode)) await batch[index].ref.delete().catch(() => {});
      else console.error("News push failed:", result.reason?.message || result.reason);
    }));
  }
  return { configured: true, delivered, subscribed: targets.length };
}
