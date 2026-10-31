import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { app } from "../src/app.js";
import { createJwtSession, revokeJwtSession, verifyJwtSession } from "../src/services/jwtSession.js";
import { closePostgresPool } from "../src/config/postgres.js";

let server;
let baseUrl;

before(async () => {
  process.env.ADMIN_EMAIL = "admin@example.test";
  process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync("test-password-123", 4);
  process.env.SESSION_SECRET = "test-session-secret-is-long-enough-for-this-suite";
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await closePostgresPool();
});

test("admin login sets an HTTP-only session and protects admin routes", async () => {
  const denied = await fetch(`${baseUrl}/api/marketers`);
  assert.equal(denied.status, 401);
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: "admin@example.test", password: "test-password-123" })
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.role, "admin");
  const cookie = response.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Strict/i);
  const session = cookie.split(";")[0];
  const current = await fetch(`${baseUrl}/api/auth/me`, { headers: { cookie: session } });
  assert.equal(current.status, 200);
  assert.equal((await current.json()).user.email, "admin@example.test");
  const logout = await fetch(`${baseUrl}/api/auth/logout`, { method: "POST", headers: { cookie: session } });
  assert.equal(logout.status, 204);
});

test("admin cannot change a marketer profile photo", async () => {
  const token = await createJwtSession({ sub: "admin", role: "admin" });
  const response = await fetch(`${baseUrl}/api/marketers/me/photo`, {
    method: "DELETE",
    headers: { cookie: `school_visit_session=${token}` }
  });
  assert.equal(response.status, 403);
});

test("monthly attendance requires login and a selected marketer", async () => {
  const path = `${baseUrl}/api/data/attendance/monthly?month=2026-10`;
  assert.equal((await fetch(path)).status, 401);
  const token = await createJwtSession({ sub: "admin", role: "admin" });
  const headers = { cookie: `school_visit_session=${token}` };
  assert.equal((await fetch(path, { headers })).status, 400);
  assert.equal((await fetch(`${path}&marketerId=../other`, { headers })).status, 400);
  assert.equal((await fetch(`${baseUrl}/api/data/attendance/monthly?month=2026-13&marketerId=example`, { headers })).status, 400);
});

test("admin photo edit route validates image content", async () => {
  const token = await createJwtSession({ sub: "admin", role: "admin" });
  const response = await fetch(`${baseUrl}/api/marketers/example/photo`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: `school_visit_session=${token}` },
    body: JSON.stringify({ photo: "data:image/svg+xml;base64,PHN2Zy8+" })
  });
  assert.equal(response.status, 400);
});

test("admin own profile photo requires login and validates the image", async () => {
  const anonymous = await fetch(`${baseUrl}/api/auth/me/photo`);
  assert.equal(anonymous.status, 401);
  const token = await createJwtSession({ sub: "admin", role: "admin" });
  const response = await fetch(`${baseUrl}/api/auth/me/photo`, {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: `school_visit_session=${token}` },
    body: JSON.stringify({ photo: "data:image/svg+xml;base64,PHN2Zy8+" })
  });
  assert.equal(response.status, 400);
});

test("invalid admin password is rejected", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: "admin@example.test", password: "wrong-password" })
  });
  assert.equal(response.status, 401);
});

test("custom reports require admin authentication and validate input", async () => {
  const denied = await fetch(`${baseUrl}/api/custom-reports`);
  assert.equal(denied.status, 401);
  const token = await createJwtSession({ sub: "admin", role: "admin" });
  const cookie = `school_visit_session=${token}`;
  const invalid = await fetch(`${baseUrl}/api/custom-reports`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ title: "Example", date: "2026-02-31" })
  });
  assert.equal(invalid.status, 400);
});

test("news publishing requires admin and a valid report date range", async () => {
  const path = `${baseUrl}/api/news`;
  assert.equal((await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status, 401);
  const token = await createJwtSession({ sub: "admin", role: "admin" });
  const invalid = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `school_visit_session=${token}` },
    body: JSON.stringify({ title: "Expense report", fromDate: "2026-10-24", toDate: "2026-10-23" })
  });
  assert.equal(invalid.status, 400);
});

test("scheduled news requires admin and rejects an invalid time before database access", async () => {
  const path = `${baseUrl}/api/news/schedules`;
  assert.equal((await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status, 401);
  const token = await createJwtSession({ sub: "admin", role: "admin" });
  const invalid = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `school_visit_session=${token}` },
    body: JSON.stringify({ message: "Daily update", recipientIds: [], repeat: "once", date: "2026-10-24", time: "25:00" })
  });
  assert.equal(invalid.status, 400);
});

test("only marketers can mark news as read", async () => {
  const path = `${baseUrl}/api/news/read`;
  assert.equal((await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status, 401);
  const token = await createJwtSession({ sub: "admin", role: "admin" });
  const admin = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `school_visit_session=${token}` },
    body: JSON.stringify({ ids: [] })
  });
  assert.equal(admin.status, 403);
});

test("imported reports require admin authentication and reject invalid rows", async () => {
  const path = `${baseUrl}/api/custom-reports/import`;
  assert.equal((await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status, 401);
  const token = await createJwtSession({ sub: "admin", role: "admin" });
  const invalid = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `school_visit_session=${token}` },
    body: JSON.stringify({ title: "Imported", date: "2026-10-22", columns: [{ key: "name", label: "Name", type: "text" }], rows: [] })
  });
  assert.equal(invalid.status, 400);
});

test("visit import requires an admin and rejects rows without a visit date", async () => {
  const path = `${baseUrl}/api/visits/import/example-marketer`;
  const headers = { "content-type": "application/json" };
  assert.equal((await fetch(path, { method: "POST", headers, body: JSON.stringify({ rows: [] }) })).status, 401);
  const token = await createJwtSession({ sub: "admin", role: "admin" });
  const invalid = await fetch(path, {
    method: "POST",
    headers: { ...headers, cookie: `school_visit_session=${token}` },
    body: JSON.stringify({ rows: [{ date: "", schoolName: "Example School" }] })
  });
  assert.equal(invalid.status, 400);
});

test("marketer creation rejects an invalid CNIC before saving", async () => {
  const token = await createJwtSession({ sub: "admin", role: "admin" });
  const response = await fetch(`${baseUrl}/api/marketers`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `school_visit_session=${token}` },
    body: JSON.stringify({ name: "Test", email: "test@example.test", phone: "03000000000", password: "test-password", cnic: "123" })
  });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /CNIC/);
});

test("saved card creation requires admin authentication and a valid card", async () => {
  assert.equal((await fetch(`${baseUrl}/api/cards`)).status, 401);
  const token = await createJwtSession({ sub: "admin", role: "admin" });
  const invalid = await fetch(`${baseUrl}/api/cards`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `school_visit_session=${token}` },
    body: JSON.stringify({ template: {}, values: {} })
  });
  assert.equal(invalid.status, 400);
});

test("marketer card endpoint is private to marketers", async () => {
  assert.equal((await fetch(`${baseUrl}/api/cards/me`)).status, 401);
  const token = await createJwtSession({ sub: "admin", role: "admin" });
  const response = await fetch(`${baseUrl}/api/cards/me`, { headers: { cookie: `school_visit_session=${token}` } });
  assert.equal(response.status, 403);
});

test("forwarded local login requests are accepted", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "127.0.0.1" },
    body: JSON.stringify({ identifier: "admin@example.test", password: "test-password-123" })
  });
  assert.equal(response.status, 200);
});

test("JWT rejects tampering and logout revokes it", async () => {
  const token = await createJwtSession({ sub: "admin", role: "admin" });
  assert.equal((await verifyJwtSession(token))?.role, "admin");
  assert.equal(await verifyJwtSession(`${token}x`), null);
  await revokeJwtSession(token);
  assert.equal(await verifyJwtSession(token), null);
});
