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

export function installIosPullToRefresh() {
  if (!isIosHomeScreenApp()) return;

  const indicator = document.createElement("div");
  indicator.setAttribute("aria-label", "Pull down to refresh");
  indicator.style.cssText = "position:fixed;top:calc(env(safe-area-inset-top, 0px) + 8px);left:50%;z-index:2147483647;width:36px;height:36px;display:grid;place-items:center;border:1px solid #e8ccd5;border-radius:50%;background:#fff;color:#790a29;box-shadow:0 4px 14px #42091d30;font:700 22px system-ui;opacity:0;transform:translate(-50%,-50px);transition:transform .16s ease,opacity .16s ease;pointer-events:none";
  const arrow = document.createElement("span");
  arrow.textContent = "\u21bb";
  arrow.style.display = "inline-block";
  arrow.style.lineHeight = "1";
  indicator.appendChild(arrow);
  const style = document.createElement("style");
  style.textContent = "@keyframes jp-pull-refresh-arrow{to{transform:rotate(360deg)}}";
  document.head.appendChild(style);
  document.body.appendChild(indicator);

  let startY = null;
  let distance = 0;
  let refreshing = false;
  const reset = () => {
    startY = null;
    distance = 0;
    if (!refreshing) {
      indicator.style.opacity = "0";
      indicator.style.transform = "translate(-50%,-50px)";
    }
  };
  document.addEventListener("touchstart", (event) => {
    if (refreshing || !navigator.onLine || event.touches.length !== 1 || window.scrollY > 1) return;
    if (event.target instanceof Element && event.target.closest("input,textarea,select,[role=dialog],.admin-report-expanded")) return;
    startY = event.touches[0].clientY;
  }, { passive: true });
  document.addEventListener("touchmove", (event) => {
    if (startY === null || event.touches.length !== 1) return;
    distance = Math.max(0, event.touches[0].clientY - startY);
    if (distance < 8) return;
    if (window.scrollY > 1) { reset(); return; }
    if (event.cancelable) event.preventDefault();
    indicator.style.opacity = "1";
    indicator.style.transform = `translate(-50%,${Math.min(8, distance / 3 - 35)}px)`;
  }, { passive: false });
  document.addEventListener("touchend", () => {
    if (distance < 80 || refreshing) { reset(); return; }
    refreshing = true;
    indicator.setAttribute("aria-label", "Refreshing app");
    indicator.style.transform = "translate(-50%,8px)";
    arrow.style.animation = "jp-pull-refresh-arrow 1s linear infinite";
    refreshHomeScreenApp().catch(() => { refreshing = false; arrow.style.animation = "none"; reset(); });
  }, { passive: true });
  document.addEventListener("touchcancel", reset, { passive: true });
}
