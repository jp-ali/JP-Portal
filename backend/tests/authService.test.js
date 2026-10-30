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

test("mobile email capitalization does not reject a valid account", async () => {
  const hash = await bcrypt.hash("account-secret", 4);
  const previousAdminEmail = process.env.ADMIN_EMAIL;
  const previousAdminHash = process.env.ADMIN_PASSWORD_HASH;
  try {
    process.env.ADMIN_EMAIL = "admin@example.test";
    process.env.ADMIN_PASSWORD_HASH = hash;
    assert.equal((await authenticate("Admin@Example.Test", "account-secret")).profile.role, "admin");
  } finally {
    if (previousAdminEmail === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = previousAdminEmail;
    if (previousAdminHash === undefined) delete process.env.ADMIN_PASSWORD_HASH;
    else process.env.ADMIN_PASSWORD_HASH = previousAdminHash;
  }

  const lookedUp = [];
  const repository = { findMarketerByIdentifier: async (identifier) => {
    lookedUp.push(identifier);
    return identifier === "person@example.test"
      ? { id: "existing-123", email: identifier, passwordHash: hash } : null;
  } };
  assert.equal((await authenticate("Person@Example.Test", "account-secret", repository)).profile.marketerId, "existing-123");
  assert.deepEqual(lookedUp, ["Person@Example.Test", "person@example.test"]);
});

test("plaintext password records cannot log in", async () => {
  const repository = {
    findMarketerByIdentifier: async () => ({ id: "existing-123", email: "person@example.test", password: "old-plaintext" })
  };
  assert.equal(await authenticate("person@example.test", "old-plaintext", repository), null);
});
