import test from "node:test";
import assert from "node:assert/strict";
import { readTrainerPortalPreference, saveTrainerPortalPreference } from "./trainerPortalPreference.js";

test("admin trainer portal choice persists until switching", () => {
  const values = new Map();
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
  const admin = { role: "admin", email: "Admin@Example.com" };
  const sameAdmin = { role: "admin", email: "admin@example.com" };
  const anotherAdmin = { role: "admin", email: "other@example.com" };
  assert.equal(readTrainerPortalPreference(admin), false);
  saveTrainerPortalPreference(admin, true);
  assert.equal(readTrainerPortalPreference(sameAdmin), true);
  assert.equal(readTrainerPortalPreference(anotherAdmin), false);
  saveTrainerPortalPreference(admin, false);
  assert.equal(readTrainerPortalPreference(sameAdmin), false);
  saveTrainerPortalPreference(admin, true);
  assert.equal(readTrainerPortalPreference(sameAdmin), true);
  delete globalThis.localStorage;
});
