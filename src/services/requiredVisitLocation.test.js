import test from "node:test";
import assert from "node:assert/strict";
import { getRequiredVisitPosition, gpsStamp, visitLocationStamp } from "./requiredVisitLocation.js";

test("visit photos require a fresh valid GPS position", async () => {
  let options;
  const position = await getRequiredVisitPosition({
    getCurrentPosition(resolve, _reject, value) {
      options = value;
      resolve({ coords: { latitude: 33.6844, longitude: 73.0479 } });
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

test("address lookup failure keeps verified GPS coordinates on the photo", async () => {
  const position = { latitude: 33.6844, longitude: 73.0479 };
  assert.equal(await visitLocationStamp(position, () => Promise.reject(new Error("offline"))), gpsStamp(position));
});
