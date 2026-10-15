import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { app } from "../src/app.js";

let server;
let loginUrl;

before(async () => {
  process.env.ADMIN_EMAIL = "admin-rate-limit@example.test";
  process.env.ADMIN_PASSWORD_HASH = bcrypt.hashSync("correct-password", 4);
  process.env.SESSION_SECRET = "test-session-secret-is-long-enough-for-rate-limit";
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  loginUrl = `http://127.0.0.1:${server.address().port}/api/auth/login`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

async function attempt(password) {
  return fetch(loginUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier: process.env.ADMIN_EMAIL, password })
  });
}

test("successful logins do not consume the failed-login limit", async () => {
  for (let i = 0; i < 12; i += 1) {
    assert.equal((await attempt("correct-password")).status, 200);
  }
  assert.equal((await attempt("wrong-password")).status, 401);
});

test("too many failed logins return a clear JSON error", async () => {
  for (let i = 0; i < 9; i += 1) {
    assert.equal((await attempt("wrong-password")).status, 401);
  }
  const blocked = await attempt("wrong-password");
  assert.equal(blocked.status, 429);
  assert.match((await blocked.json()).error, /too many login attempts/i);
});
