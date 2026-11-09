import assert from "node:assert/strict";
import test from "node:test";
import { buildMonthlyAttendanceReport } from "./monthlyAttendanceExport.js";

test("monthly export keeps one row per marketer and counts present, Sunday and holiday once", () => {
  const report = buildMonthlyAttendanceReport("2026-06", [{
    id: "m1", name: "Ali", designation: "Marketing Executive", days: [
      { date: "2026-06-01", startMarked: true, startTime: "08:10 AM" },
      { date: "2026-06-03", status: "leave" },
      { date: "2026-06-08", status: "leave" },
      { date: "2026-06-14", status: "completed" }
    ]
  }], [{ date: "2026-06-05", name: "Gazetted holiday" }, { date: "2026-06-14", name: "Holiday on Sunday" }], new Date(2026, 5, 15));
  const person = report.people[0];
  assert.equal(report.dayCount, 30);
  assert.equal(person.days[0].time, "08:10 AM");
  assert.equal(person.days[4].status, "gazetted");
  assert.equal(person.days[6].status, "sunday");
  assert.equal(person.days[7].status, "leave");
  assert.equal(person.days[13].status, "present");
  assert.equal(person.days[15].status, "future");
  assert.deepEqual(person.totals, { present: 2, absent: 9, leave: 2, sunday: 1, gazetted: 1, counted: 4, elapsed: 15 });
});

test("trainer monthly export counts check-ins and excludes leave from credited days", () => {
  const report = buildMonthlyAttendanceReport("2026-11", [{
    id: "t1", name: "Trainer", designation: "Trainer", days: [
      { date: "2026-11-02", status: "present", startMarked: true, startTime: "09:00 AM" },
      { date: "2026-11-03", status: "leave" }
    ]
  }], [{ date: "2026-11-04", name: "Holiday" }], new Date(2026, 10, 5));
  assert.equal(report.people[0].days[1].status, "present");
  assert.equal(report.people[0].days[2].status, "leave");
  assert.equal(report.people[0].days[3].status, "gazetted");
  assert.equal(report.people[0].totals.counted, 3);
});
