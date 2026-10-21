import { test } from "node:test";
import assert from "node:assert/strict";
import { updateOwnProfilePhoto } from "../src/services/marketerService.js";

test("profile photo rejects untrusted formats before database access", async () => {
  await assert.rejects(updateOwnProfilePhoto("marketer-1", "data:image/svg+xml;base64,PHN2Zy8+"), { status: 400 });
  await assert.rejects(updateOwnProfilePhoto("marketer-1", "data:image/jpeg;base64," + "A".repeat(200001)), { status: 400 });
});
