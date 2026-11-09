import { formatAddressForStamp } from "./visitPhotos.js";

export const gpsStamp = ({ latitude, longitude }) => `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

export function getRequiredVisitPosition(geolocation = globalThis.navigator?.geolocation) {
  if (!geolocation?.getCurrentPosition) return Promise.reject(new Error("Location is required for visit photos. Open the portal over HTTPS and allow Location access in your browser."));
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      ({ coords }) => {
        const latitude = Number(coords?.latitude);
        const longitude = Number(coords?.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
          reject(new Error("A valid GPS location is required. Turn on Location Services and try the photo again."));
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
  const gps = gpsStamp(position);
  if (!lookup) return gps;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await lookup(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.latitude}&lon=${position.longitude}&zoom=18&addressdetails=1`, { signal: controller.signal });
    if (!response.ok) return gps;
    const data = await response.json();
    const address = formatAddressForStamp(data.address || {}, position.latitude, position.longitude);
    return address && address !== gps ? `${gps}, ${address}` : gps;
  } catch {
    return gps;
  } finally {
    clearTimeout(timeout);
  }
}
