import assert from "node:assert/strict";
import test from "node:test";
import { creditedAttendanceDays } from "./monthlyAttendanceCredit.js";

test("counts marked days and elapsed Sundays once, without absent, leave or future days", () => {
  const rows = [
    { date: "2026-06-01", startMarked: true },
    { date: "2026-06-01", status: "completed" },
    { date: "2026-06-02", status: "started" },
    { date: "2026-06-03", status: "leave" },
    { date: "2026-06-07", startMarked: true },
    { date: "2026-06-16", status: "completed" }
  ];
  assert.equal(creditedAttendanceDays(rows, "2026-06", "2026-06-15"), 4);
  assert.equal(creditedAttendanceDays(rows, "2026-06", "2026-07-01"), 7);
  assert.equal(creditedAttendanceDays(rows, "2026-07", "2026-06-15"), 0);
});
