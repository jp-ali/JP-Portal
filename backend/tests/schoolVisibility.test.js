import test from "node:test";
import assert from "node:assert/strict";
import { canSeeSchool } from "../src/domain/schoolVisibility.js";

test("manual schools belong only to the adding marketer", () => {
  const school = { source: "manual-marketer", addedByMarketerEmail: "ALI@EXAMPLE.TEST" };
  assert.equal(canSeeSchool(school, { role: "marketer", email: "ali@example.test" }), true);
  assert.equal(canSeeSchool(school, { role: "marketer", email: "sara@example.test" }), false);
  assert.equal(canSeeSchool(school, { role: "admin", email: "admin@example.test" }), true);
});

test("unowned manual records stay private; catalog schools remain shared", () => {
  assert.equal(canSeeSchool({ source: "manual-marketer" }, { role: "marketer", email: "ali@example.test" }), false);
  assert.equal(canSeeSchool({ source: "openstreetmap" }, { role: "marketer", email: "ali@example.test" }), true);
});

test("trainer-added schools stay private to their trainer", () => {
  const school = { source: "manual-trainer", addedByTrainerId: "trainer-1" };
  assert.equal(canSeeSchool(school, { role: "trainer", trainerId: "trainer-1" }), true);
  assert.equal(canSeeSchool(school, { role: "trainer", trainerId: "trainer-2" }), false);
  assert.equal(canSeeSchool(school, { role: "marketer", email: "ali@example.test" }), false);
  assert.equal(canSeeSchool(school, { role: "admin" }), true);
});
