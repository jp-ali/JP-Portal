import { request } from "./authApi.js";

function decodeKey(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const binary = atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export async function enableNewsNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    throw new Error("Push notifications are unavailable on this device. On iPhone, add the portal to your Home Screen first.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Allow notifications in your device settings to receive news alerts.");
  const { publicKey } = await request("/news/push-key");
  if (!publicKey) throw new Error("Phone notifications are not configured on the API server yet.");
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({
    userVisibleOnly: true, applicationServerKey: decodeKey(publicKey)
  });
  await request("/news/subscription", { method: "POST", body: JSON.stringify({ subscription: subscription.toJSON() }) });
  return true;
}

export async function newsNotificationStatus() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window) || Notification.permission !== "granted") return false;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = registration && await registration.pushManager.getSubscription();
  if (!subscription) return false;
  await request("/news/subscription", { method: "POST", body: JSON.stringify({ subscription: subscription.toJSON() }) });
  return true;
}

export async function removeNewsSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = registration && await registration.pushManager.getSubscription();
  if (!subscription) return;
  await request("/news/subscription", { method: "DELETE", body: JSON.stringify({ endpoint: subscription.endpoint }) });
  await subscription.unsubscribe();
}
