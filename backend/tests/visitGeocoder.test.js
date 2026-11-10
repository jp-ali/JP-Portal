import test from "node:test";
import assert from "node:assert/strict";
import { createVisitGeocoder, visitCoordinates } from "../src/services/visitGeocoder.js";

const result = { address: { road: "Agha Shahi Avenue", city: "Islamabad", country: "Pakistan" }, display_name: "Agha Shahi Avenue, Islamabad, Pakistan" };

test("map proxy validates coordinates before calling the provider", async () => {
  for (const values of [["", "73"], ["91", "73"], ["33", "181"], [[], "73"], [null, 73], ["NaN", "73"]]) {
    assert.throws(() => visitCoordinates(...values), /Valid GPS/);
  }
  const lookup = createVisitGeocoder({ lookup: async () => { throw new Error("must not run"); } });
  await assert.rejects(lookup("not-a-point", 73), /Valid GPS/);
});

test("same-location requests share one provider call, identify the app, and cache addresses", async () => {
  let calls = 0;
  const lookup = createVisitGeocoder({ intervalMs: 0, lookup: async (url, options) => {
    calls++;
    assert.equal(url.hostname, "nominatim.openstreetmap.org");
    assert.equal(url.searchParams.get("lat"), "33.68440");
    assert.equal(url.searchParams.get("accept-language"), "en");
    assert.match(options.headers["User-Agent"], /JP-Portal/);
    return Response.json(result);
  } });
  const [first, second] = await Promise.all([lookup(33.6844, 73.0479), lookup(33.6844, 73.0479)]);
  assert.deepEqual(first, second);
  assert.equal(first.address.city, "Islamabad");
  assert.equal(first.attribution, "© OpenStreetMap contributors");
  await lookup(33.6844, 73.0479);
  assert.equal(calls, 1);
});

test("provider failures do not cache a fake address and a later retry can succeed", async () => {
  let calls = 0;
  const lookup = createVisitGeocoder({ intervalMs: 0, lookup: async () => ++calls === 1 ? new Response("busy", { status: 429 }) : Response.json(result) });
  await assert.rejects(lookup(33, 73), (error) => error.status === 503 && /location address/.test(error.message));
  assert.equal((await lookup(33, 73)).address.city, "Islamabad");
  assert.equal(calls, 2);
});

test("shared map requests start at most once per configured interval", async () => {
  let clock = 0;
  const started = [];
  const lookup = createVisitGeocoder({ now: () => clock, sleep: async (delay) => { clock += delay; }, lookup: async () => {
    started.push(clock);
    return Response.json(result);
  } });
  await Promise.all([lookup(33, 73), lookup(34, 73), lookup(35, 73)]);
  assert.deepEqual(started, [0, 1100, 2200]);
});
