import assert from "node:assert/strict";
import test from "node:test";
import { summarizeVisitDates } from "../src/controllers/visitController.js";

test("marketer summary counts visits by Pakistan day and month without visit photos", () => {
  const rows = [
    { createdAt: { toDate: () => new Date("2026-10-21T19:30:00Z") } },
    { createdAt: { toDate: () => new Date("2026-10-22T10:00:00Z") } },
    { createdAt: { toDate: () => new Date("2026-09-30T19:30:00Z") } }
  ];
  assert.deepEqual(summarizeVisitDates(rows, "2026-10-22"), { visits: 3, todayVisits: 2, monthlyVisits: 3 });
});
