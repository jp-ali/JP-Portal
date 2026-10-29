import { test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { authenticate } from "../src/services/authService.js";

test("marketer login verifies a hashed password and keeps the account ID", async () => {
  const hash = await bcrypt.hash("account-secret", 4);
  const repository = {
    findMarketerByIdentifier: async () => ({ id: "existing-123", email: "person@example.test", name: "Person", passwordHash: hash, assignedCityIds: ["city-a"] })
  };
  const result = await authenticate("person@example.test", "account-secret", repository);
  assert.equal(result.profile.marketerId, "existing-123");
  assert.deepEqual(result.profile.assignedCityIds, ["city-a"]);
});

test("incorrect marketer password is rejected", async () => {
  const hash = await bcrypt.hash("account-secret", 4);
  const repository = {
    findMarketerByIdentifier: async () => ({ id: "existing-123", email: "person@example.test", passwordHash: hash })
  };
  assert.equal(await authenticate("person@example.test", "wrong", repository), null);
});

test("plaintext password records cannot log in", async () => {
  const repository = {
    findMarketerByIdentifier: async () => ({ id: "existing-123", email: "person@example.test", password: "old-plaintext" })
  };
  assert.equal(await authenticate("person@example.test", "old-plaintext", repository), null);
});
