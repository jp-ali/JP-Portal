import test from "node:test";
import assert from "node:assert/strict";
import { canSeeSchool, makeMarketerSchoolId } from "./schoolOwnership.js";

test("manual schools are visible only to their owner", () => {
  const school = { source: "manual-marketer", addedByMarketerEmail: "ALI@EXAMPLE.TEST" };
  assert.equal(canSeeSchool(school, { role: "marketer", email: "ali@example.test" }), true);
  assert.equal(canSeeSchool(school, { role: "marketer", email: "sara@example.test" }), false);
  assert.equal(canSeeSchool(school, { role: "admin" }), true);
  assert.equal(canSeeSchool({ source: "openstreetmap" }, { role: "marketer", email: "sara@example.test" }), true);
});

test("two marketers can add the same school name in one area without colliding", () => {
  const first = makeMarketerSchoolId("area-1", "City School", "ali@example.test");
  assert.equal(first, makeMarketerSchoolId("area-1", "City School", "ALI@EXAMPLE.TEST"));
  assert.notEqual(first, makeMarketerSchoolId("area-1", "City School", "sara@example.test"));
  assert.notEqual(first, makeMarketerSchoolId("area-2", "City School", "ali@example.test"));
});
