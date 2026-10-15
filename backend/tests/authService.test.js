import { test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { authenticate } from "../src/services/authService.js";

test("legacy marketer login hashes the password and keeps the account ID", async () => {
  process.env.ENABLE_LEGACY_PASSWORD_MIGRATION = "true";
  const writes = [];
  const repository = {
    findMarketerByIdentifier: async () => ({ id: "existing-123", email: "person@example.test", name: "Person", password: "legacy-secret", assignedCityIds: ["city-a"] }),
    migrateLegacyPassword: async (id, hash) => writes.push({ id, hash })
  };
  const result = await authenticate("person@example.test", "legacy-secret", repository);
  assert.equal(result.profile.marketerId, "existing-123");
  assert.deepEqual(result.profile.assignedCityIds, ["city-a"]);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].id, "existing-123");
  assert.equal(await bcrypt.compare("legacy-secret", writes[0].hash), true);
  process.env.ENABLE_LEGACY_PASSWORD_MIGRATION = "false";
});

test("incorrect marketer password does not modify the record", async () => {
  let changed = false;
  const repository = {
    findMarketerByIdentifier: async () => ({ id: "existing-123", email: "person@example.test", password: "legacy-secret" }),
    migrateLegacyPassword: async () => { changed = true; }
  };
  assert.equal(await authenticate("person@example.test", "wrong", repository), null);
  assert.equal(changed, false);
});

test("legacy login leaves records unchanged while migration switch is off", async () => {
  process.env.ENABLE_LEGACY_PASSWORD_MIGRATION = "false";
  let changed = false;
  const repository = {
    findMarketerByIdentifier: async () => ({ id: "existing-123", email: "person@example.test", password: "legacy-secret" }),
    migrateLegacyPassword: async () => { changed = true; }
  };
  assert.equal((await authenticate("person@example.test", "legacy-secret", repository)).profile.marketerId, "existing-123");
  assert.equal(changed, false);
});
