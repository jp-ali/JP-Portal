import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/app.js";

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("health endpoint responds with JSON", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
});

test("malformed JSON returns a controlled error", async () => {
  const response = await fetch(`${baseUrl}/api/health`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{"
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Invalid JSON request body" });
});

test("configured local frontend origin can submit through the Vite proxy", async () => {
  process.env.DEV_FRONTEND_ORIGIN = "http://localhost:5173";
  const response = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { origin: "http://localhost:5173" }
  });
  assert.equal(response.status, 204);
});

test("unconfigured origins are rejected", async () => {
  process.env.DEV_FRONTEND_ORIGIN = "http://localhost:5173";
  const response = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: { origin: "http://untrusted.example" }
  });
  assert.equal(response.status, 403);
});
