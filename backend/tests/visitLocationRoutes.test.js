import "dotenv/config";
import { after, test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createVisitLocationRoutes } from "../src/routes/visitLocationRoutes.js";
import { closePostgresPool } from "../src/config/postgres.js";

after(closePostgresPool);

async function withServer(routes, callback) {
  const app = express();
  app.use("/api/visit-location", routes);
  app.use((error, _request, response, _next) => response.status(error.status || 500).json({ error: error.message }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try { await callback(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test("address lookup requires a signed-in account", async () => {
  await withServer(createVisitLocationRoutes({ lookup: async () => { throw new Error("must not run"); } }), async (base) => {
    assert.equal((await fetch(`${base}/api/visit-location/reverse?lat=33&lon=73`)).status, 401);
  });
});

test("authenticated address route returns map data and rejects invalid coordinates", async () => {
  let calls = 0;
  await withServer(createVisitLocationRoutes({ authenticate: (_request, _response, next) => next(), lookup: async (lat, lon) => {
    calls++; assert.equal(lat, 33); assert.equal(lon, 73);
    return { address: { city: "Islamabad" }, displayName: "Islamabad, Pakistan" };
  } }), async (base) => {
    const response = await fetch(`${base}/api/visit-location/reverse?lat=33&lon=73`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal((await response.json()).address.city, "Islamabad");
    assert.equal((await fetch(`${base}/api/visit-location/reverse?lat=bad&lon=73`)).status, 400);
    assert.equal((await fetch(`${base}/api/visit-location/reverse?lat=33`)).status, 400);
    assert.equal(calls, 1);
  });
});
