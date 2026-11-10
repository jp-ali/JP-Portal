import test from "node:test";
import assert from "node:assert/strict";
import { getRequiredVisitPosition, gpsStamp, visitLocationStamp } from "./requiredVisitLocation.js";

test("visit photos require a fresh valid GPS position", async () => {
  let options;
  const position = await getRequiredVisitPosition({
    getCurrentPosition(resolve, _reject, value) {
      options = value;
      resolve({ coords: { latitude: 33.6844, longitude: 73.0479, accuracy: 12 }, timestamp: Date.now() });
    }
  });
  assert.deepEqual(position, { latitude: 33.6844, longitude: 73.0479 });
  assert.deepEqual(options, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  assert.equal(gpsStamp(position), "GPS: 33.68440, 73.04790");
});

test("denied or unavailable location cannot produce a visit photo", async () => {
  await assert.rejects(getRequiredVisitPosition(null), /Location is required/);
  await assert.rejects(getRequiredVisitPosition({ getCurrentPosition(_resolve, reject) { reject({ code: 1 }); } }), /Location permission is required/);
  await assert.rejects(getRequiredVisitPosition({ getCurrentPosition(resolve) { resolve({ coords: { latitude: NaN, longitude: 73 } }); } }), /valid GPS location/);
});

test("online photos get a readable address through the authenticated same-origin API", async () => {
  const position = { latitude: 33.6844, longitude: 73.0479 };
  const stamp = await visitLocationStamp(position, async (url, options) => {
    assert.equal(url, "/api/visit-location/reverse?lat=33.6844&lon=73.0479");
    assert.equal(options.credentials, "same-origin");
    return { ok: true, json: async () => ({ address: { road: "Agha Shahi Avenue", suburb: "G-9/4", city: "Islamabad", country: "Pakistan" } }) };
  });
  assert.equal(stamp, "Agha Shahi Avenue, G-9/4, Islamabad, Pakistan\nGPS: 33.68440, 73.04790");
});

test("online photos do not silently save numbers or an invented country when address lookup fails", async () => {
  const point = { latitude: 33.6844, longitude: 73.0479 };
  await assert.rejects(visitLocationStamp(point, () => Promise.reject(new Error("offline"))), /location address/);
  await assert.rejects(visitLocationStamp(point, async () => ({ ok: false })), /location address/);
  await assert.rejects(visitLocationStamp(point, async () => ({ ok: true, json: async () => ({ address: {} }) })), /location address/);
  assert.equal(await visitLocationStamp(point, async () => ({ ok: true, json: async () => ({ displayName: "G-9, Islamabad" }) })), "G-9, Islamabad\nGPS: 33.68440, 73.04790");
});

test("approximate or stale fixes cannot stamp a school photo", async () => {
  const point = { latitude: 33.6844, longitude: 73.0479, accuracy: 5000 };
  await assert.rejects(getRequiredVisitPosition({ getCurrentPosition(resolve) { resolve({ coords: point }); } }), /Precise Location/);
  point.accuracy = 12;
  await assert.rejects(getRequiredVisitPosition({ getCurrentPosition(resolve) { resolve({ coords: point, timestamp: Date.now() - 60000 }); } }), /fresh location/);
});

test("turning off location after camera startup is checked again at capture", async () => {
  let enabled = true;
  const geolocation = { getCurrentPosition(resolve, reject) {
    if (!enabled) return reject({ code: 1 });
    resolve({ coords: { latitude: 33.6844, longitude: 73.0479, accuracy: 12 }, timestamp: Date.now() });
  } };
  await getRequiredVisitPosition(geolocation);
  enabled = false;
  await assert.rejects(getRequiredVisitPosition(geolocation), /Location permission is required/);
});
