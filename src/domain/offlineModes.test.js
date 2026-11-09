import test from "node:test";
import assert from "node:assert/strict";
import { canUseOfflineMode, offlineModeFor } from "./offlineModes.js";

test("offline modes default by account role and only Both permits switching", () => {
  assert.equal(offlineModeFor({ role: "marketer" }), "marketer");
  assert.equal(offlineModeFor({ role: "trainer" }), "trainer");
  assert.equal(offlineModeFor({ role: "trainer", offlineMode: "none" }), "none");
  assert.equal(canUseOfflineMode({ role: "trainer", offlineMode: "none" }, "trainer"), false);
  assert.equal(canUseOfflineMode({ role: "marketer" }, "trainer"), false);
  assert.equal(canUseOfflineMode({ role: "marketer", offlineMode: "trainer" }, "marketer"), false);
  assert.equal(canUseOfflineMode({ role: "marketer", offlineMode: "both" }, "marketer"), true);
  assert.equal(canUseOfflineMode({ role: "marketer", offlineMode: "both" }, "trainer"), true);
});
