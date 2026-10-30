import test from "node:test";
import assert from "node:assert/strict";
import { sendPushWithRetry } from "../src/services/newsPushDelivery.js";

test("temporary push service failure is retried", async () => {
  let attempts = 0;
  const result = await sendPushWithRetry({ endpoint: "test" }, "payload", async () => {
    attempts++;
    if (attempts === 1) throw Object.assign(new Error("busy"), { statusCode: 503 });
    return { statusCode: 201 };
  }, async () => {});
  assert.equal(attempts, 2);
  assert.equal(result.statusCode, 201);
});

test("expired push subscription is not retried", async () => {
  let attempts = 0;
  await assert.rejects(() => sendPushWithRetry({ endpoint: "test" }, "payload", async () => {
    attempts++;
    throw Object.assign(new Error("gone"), { statusCode: 410 });
  }, async () => {}), /gone/);
  assert.equal(attempts, 1);
});
