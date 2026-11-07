import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { app } from "../src/app.js";
import { createJwtSession } from "../src/services/jwtSession.js";
import { closePostgresPool } from "../src/config/postgres.js";

let server;
let base;
const unique = randomUUID().slice(0, 8);
const email = `trainer-${unique}@example.test`;
const headers = (token) => ({ "content-type": "application/json", cookie: `school_visit_session=${token}` });
const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

before(async () => {
  process.env.ADMIN_EMAIL = "admin@example.test";
  process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync("test-password-123", 4);
  process.env.SESSION_SECRET = "trainer-test-session-secret-is-long-enough";
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise((resolve) => server.close(resolve)); await closePostgresPool(); });

test("admin creates a trainer; trainer signs in and only sees their records", async () => {
  const adminToken = await createJwtSession({ sub: "admin", role: "admin" });
  const create = await fetch(`${base}/api/trainers`, { method: "POST", headers: headers(adminToken), body: JSON.stringify({ name: "Test Trainer", email, designation: "Trainer", password: "trainer-password-123" }) });
  assert.equal(create.status, 201);
  const trainer = (await create.json()).trainer;
  assert.equal(trainer.passwordHash, undefined);
  const login = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ identifier: email, password: "trainer-password-123" }) });
  assert.equal(login.status, 200);
  assert.equal((await login.clone().json()).user.role, "trainer");
  const trainerToken = login.headers.get("set-cookie").split(";")[0].split("=")[1];
  assert.equal((await fetch(`${base}/api/trainers`, { headers: headers(trainerToken) })).status, 403);
  assert.equal((await fetch(`${base}/api/data/collections/visits`, { headers: headers(trainerToken) })).status, 403);
  const save = await fetch(`${base}/api/trainers/records/daily`, { method: "POST", headers: headers(trainerToken), body: JSON.stringify({ date, area: "Lahore", purpose: "School training", trainerId: "someone-else" }) });
  assert.equal(save.status, 201);
  assert.equal((await save.json()).record.trainerId, trainer.id);
  const own = await fetch(`${base}/api/trainers/records/daily?trainerId=someone-else`, { headers: headers(trainerToken) });
  assert.equal(own.status, 200);
  assert.ok((await own.json()).records.every((record) => record.trainerId === trainer.id));
  const disable = await fetch(`${base}/api/trainers/${trainer.id}`, { method: "PATCH", headers: headers(adminToken), body: JSON.stringify({ active: false }) });
  assert.equal(disable.status, 200);
  assert.equal((await fetch(`${base}/api/auth/me`, { headers: headers(trainerToken) })).status, 401);
});
