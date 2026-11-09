import { test } from "node:test";
import assert from "node:assert/strict";
import { weekDates, weekDay } from "./trainerWeek.js";

test("weekly trainer plan covers Monday through selected Saturday", () => {
  assert.deepEqual(weekDates("2026-11-02", "2026-11-07"), ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06", "2026-11-07"]);
  assert.equal(weekDay("2026-11-02"), "Monday");
  assert.deepEqual(weekDates("2026-11-02", "2026-11-04"), ["2026-11-02", "2026-11-03", "2026-11-04"]);
  assert.deepEqual(weekDates("2026-11-03", "2026-11-07"), []);
  assert.deepEqual(weekDates("2026-11-02", "2026-11-08"), []);
});
