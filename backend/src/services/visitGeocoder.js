const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function visitCoordinates(latitude, longitude) {
  if (![latitude, longitude].every((value) => (typeof value === "number" || typeof value === "string") && String(value).trim() !== "")) {
    throw Object.assign(new Error("Valid GPS coordinates are required."), { status: 400 });
  }
  const lat = Number(latitude), lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw Object.assign(new Error("Valid GPS coordinates are required."), { status: 400 });
  }
  return { latitude: lat, longitude: lon };
}

// One shared scheduler and cache for the app, rather than one map request per browser.
export function createVisitGeocoder({
  lookup = globalThis.fetch,
  endpoint = process.env.VISIT_GEOCODER_URL || "https://nominatim.openstreetmap.org/reverse",
  now = Date.now, sleep = wait, intervalMs = 1100, timeoutMs = 8000,
  cacheMs = 24 * 60 * 60 * 1000, maxEntries = 2000, maxPending = 8
} = {}) {
  const cache = new Map(), pending = new Map();
  let schedule = Promise.resolve(), lastStarted = -Infinity;
  return async function reverseVisitLocation(latitude, longitude) {
    const point = visitCoordinates(latitude, longitude);
    const key = `${point.latitude.toFixed(5)},${point.longitude.toFixed(5)}`;
    const stored = cache.get(key);
    if (stored && now() - stored.savedAt < cacheMs) return stored.value;
    if (pending.has(key)) return pending.get(key);
    if (pending.size >= maxPending) throw Object.assign(new Error("Address service is busy. Please retry the photo shortly."), { status: 503 });
    const turn = schedule.then(async () => {
      const delay = intervalMs - (now() - lastStarted);
      if (delay > 0) await sleep(delay);
      lastStarted = now();
    });
    schedule = turn.catch(() => {});
    const task = (async () => {
      await turn;
      const url = new URL(endpoint);
      url.searchParams.set("lat", point.latitude.toFixed(5));
      url.searchParams.set("lon", point.longitude.toFixed(5));
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("zoom", "18");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("accept-language", "en");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await lookup(url, {
          signal: controller.signal,
          headers: { "User-Agent": "JP-Portal/1.0 (+https://visit.javedpublishers.com)", "Accept": "application/json" }
        });
        if (!response.ok) throw new Error("Address provider unavailable");
        const data = await response.json();
        const address = Object.fromEntries(Object.entries(data.address || {})
          .filter(([name, value]) => /^[a-z_]+$/i.test(name) && typeof value === "string")
          .map(([name, value]) => [name, value.slice(0, 300)]));
        const displayName = typeof data.display_name === "string" ? data.display_name.trim().slice(0, 1000) : "";
        if (data.error || (!Object.keys(address).length && !displayName)) throw new Error("No mapped address");
        const value = { address, displayName, attribution: "© OpenStreetMap contributors" };
        cache.delete(key);
        cache.set(key, { value, savedAt: now() });
        if (cache.size > maxEntries) cache.delete(cache.keys().next().value);
        return value;
      } catch {
        throw Object.assign(new Error("Could not load the location address. Keep Location on, check your internet and retry the photo."), { status: 503 });
      } finally {
        clearTimeout(timer);
      }
    })();
    pending.set(key, task);
    try { return await task; } finally { pending.delete(key); }
  };
}

export const reverseVisitLocation = createVisitGeocoder();
