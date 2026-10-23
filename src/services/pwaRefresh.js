export function isIosHomeScreenApp() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios && (navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches);
}

export async function refreshHomeScreenApp() {
  if ("serviceWorker" in navigator && navigator.onLine) {
    try {
      const registration = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
      if (registration) await Promise.race([
        registration.update(),
        new Promise((resolve) => window.setTimeout(resolve, 4000))
      ]);
    } catch { /* Reload still works when the update check is unavailable. */ }
  }
  const url = new URL(window.location.href);
  url.searchParams.set("app_refresh", String(Date.now()));
  window.location.replace(url.href);
}
