import { formatAddressForStamp } from "./visitPhotos.js";
import { companySlugFromPath } from './companyBranding.js';

const API_BASE = import.meta.env?.VITE_API_BASE_URL || "/api";
export const MAX_VISIT_LOCATION_ACCURACY_METERS = 150;
export const gpsStamp = ({ latitude, longitude }) => `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

export function getRequiredVisitPosition(geolocation = globalThis.navigator?.geolocation) {
  if (!geolocation?.getCurrentPosition) return Promise.reject(new Error("Location is required for visit photos. Open the portal over HTTPS and allow Location access in your browser."));
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      ({ coords, timestamp }) => {
        const latitude = coords?.latitude;
        const longitude = coords?.longitude;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
          reject(new Error("A valid GPS location is required. Turn on Location Services and try the photo again."));
          return;
        }
        if (!Number.isFinite(coords?.accuracy) || coords.accuracy <= 0 || coords.accuracy > MAX_VISIT_LOCATION_ACCURACY_METERS) {
          reject(new Error("Your location is too approximate. Turn on Precise Location for this site, move where GPS can work, and retry the photo."));
          return;
        }
        if (Number.isFinite(timestamp) && Date.now() - timestamp > 30000) {
          reject(new Error("A fresh location is required. Turn on Location Services and retry the photo."));
          return;
        }
        resolve({ latitude, longitude });
      },
      (error) => reject(new Error(error?.code === 1
        ? "Location permission is required. Turn on phone Location Services, allow Location for this site in browser settings, then retry the camera."
        : error?.code === 3
          ? "Location timed out. Move where GPS can work, turn on Location Services, and retry the photo."
          : "Location is unavailable. Turn on Location Services and retry the photo.")),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  });
}

export async function visitLocationStamp(position, lookup = globalThis.fetch) {
  const failure = "Could not load the location address. Keep Location on, check your internet and retry the photo.";
  if (!lookup) throw new Error(failure);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 19000);
  try {
    const response = await lookup(`${API_BASE}/visit-location/reverse?lat=${position.latitude}&lon=${position.longitude}`, {
      signal: controller.signal, credentials: "same-origin", cache: "no-store",
      headers: companySlugFromPath() ? { 'x-company-slug': companySlugFromPath() } : {}
    });
    if (!response.ok) throw new Error(failure);
    const data = await response.json();
    const address = formatAddressForStamp(data.address || {}) || (typeof data.displayName === "string" ? data.displayName.trim() : "");
    if (!address) throw new Error(failure);
    return address;
  } catch {
    throw new Error(failure);
  } finally {
    clearTimeout(timeout);
  }
}
